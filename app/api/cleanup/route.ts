import { NextRequest, NextResponse } from "next/server";
import { environmentOptions } from "@/app/constants/pcd";
import { sendBatchSlackMessage } from "@/app/utils/slack";
import { isBefore, isSameDay, parseISO, addDays, startOfDay } from "date-fns";
import { APIItem, ExpiringRegion } from "@/app/types/pcd";

export async function GET(req: NextRequest) {
  try {
    const environment = req.nextUrl.searchParams
      .get("environment")
      ?.trim()
      .toLowerCase();

    if (!environment) {
      return NextResponse.json(
        { error: "Missing environment query param" },
        { status: 400 }
      );
    }

    const selectedEnv = environmentOptions.find(
      (env) => env.value === environment
    );

    if (!selectedEnv?.borkUrl) {
      return NextResponse.json(
        { error: `Invalid environment: ${environment}` },
        { status: 400 }
      );
    }

    const regionRes = await fetch(`${selectedEnv.borkUrl}/api/v1/regions`);
    if (!regionRes.ok) {
      const errText = await regionRes.text();
      return NextResponse.json(
        { error: `Failed to fetch regions: ${errText}` },
        { status: regionRes.status }
      );
    }

    const regionData = await regionRes.json();
    const regions: APIItem[] = regionData.items || [];

    const today = startOfDay(new Date());
    const sevenDaysFromNow = addDays(today, 7);
    const oneDayFromNow = addDays(today, 1);

    const expiredRegions: APIItem[] = [];
    const expiringInSevenDays: ExpiringRegion[] = [];
    const expiringTomorrow: ExpiringRegion[] = [];

    for (const region of regions) {
      const leaseDate = region.metadata?.lease_date;
      const ownerEmail = region.metadata?.owner;

      if (!leaseDate || !ownerEmail) continue;

      const lease = parseISO(leaseDate);

      if (isBefore(lease, today)) {
        expiredRegions.push(region);
      } else if (isSameDay(lease, sevenDaysFromNow)) {
        expiringInSevenDays.push({
          fqdn: region.fqdn,
          leaseDate,
          ownerEmail,
        });
      } else if (isSameDay(lease, oneDayFromNow)) {
        expiringTomorrow.push({
          fqdn: region.fqdn,
          leaseDate,
          ownerEmail,
        });
      }
    }

    const deleted: string[] = [];
    const failedDeletions: { region: string; reason: string }[] = [];

    for (const region of expiredRegions) {
      try {
        const res = await fetch(`${process.env.APP_URL}/api/deleteRegion`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            environment,
            shortName: region.customer_shortname,
            regionName: region.region_name,
            userEmail: "pcd-manager-automation@platform9.com",
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          failedDeletions.push({ region: region.namespace, reason: err });
        } else {
          deleted.push(region.namespace);
        }
      } catch (err: unknown) {
        failedDeletions.push({
          region: region.namespace,
          reason: err instanceof Error ? err.message : "Unknown deletion error",
        });
      }
    }

    // Send Slack notifications
    if (expiringInSevenDays.length > 0) {
      await sendBatchSlackMessage(environment, expiringInSevenDays, 7);
    }

    if (expiringTomorrow.length > 0) {
      await sendBatchSlackMessage(environment, expiringTomorrow, 1);
    }

    return NextResponse.json({
      deleted,
      failedDeletions,
      notified7Days: expiringInSevenDays.map((r) => r.ownerEmail),
      notifiedTomorrow: expiringTomorrow.map((r) => r.ownerEmail),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("❌ Cleanup API error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
