import { NextRequest, NextResponse } from "next/server";
import { bork_urls } from "@/app/constants/pcd";
import { sendBatchSlackMessage } from "@/app/utils/slack";
import { isBefore, isSameDay, parseISO, addDays, startOfDay } from "date-fns";
import { APIItem, ExpiringRegion } from "@/app/types/pcd";

export async function POST(req: NextRequest) {
  try {
    const { environment } = await req.json();

    if (!environment) {
      return NextResponse.json(
        { message: "Missing environment" },
        { status: 400 }
      );
    }

    const baseURL = bork_urls[environment];
    const regionRes = await fetch(`${baseURL}/api/v1/regions`);
    const regionData = await regionRes.json();
    const regions: APIItem[] = regionData.items || [];

    const today = startOfDay(new Date());
    const fiveDaysFromNow = addDays(today, 5);
    const oneDayFromNow = addDays(today, 1);

    const expiredRegions: APIItem[] = [];
    const expiringInFiveDays: ExpiringRegion[] = [];
    const expiringTomorrow: ExpiringRegion[] = [];

    for (const region of regions) {
      const leaseDate = region.metadata?.lease_date;
      const ownerEmail = region.metadata?.owner;

      if (!leaseDate || !ownerEmail) continue;

      const lease = parseISO(leaseDate);

      if (isBefore(lease, today)) {
        expiredRegions.push(region);
      } else if (isSameDay(lease, fiveDaysFromNow)) {
        expiringInFiveDays.push({
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

    // DELETE expired regions
    for (const region of expiredRegions) {
      try {
        const res = await fetch(`${process.env.APP_URL}/api/deleteRegion`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            environment,
            shortName: region.customer_shortname,
            regionName: region.region_name,
            userEmail: "pcd-manager@platform9.com",
          }),
        });

        if (!res.ok) {
          console.error(`❌ Failed to delete region: ${region.namespace}`);
        }
      } catch (err) {
        console.error(`🔥 Error deleting region ${region.namespace}:`, err);
      }
    }

    // Send Slack notifications
    if (expiringInFiveDays.length > 0) {
      await sendBatchSlackMessage(environment, expiringInFiveDays, 5);
    }

    if (expiringTomorrow.length > 0) {
      await sendBatchSlackMessage(environment, expiringTomorrow, 1);
    }

    return NextResponse.json({
      deleted: expiredRegions.map((r) => r.namespace),
      notified5Days: expiringInFiveDays.map((r) => r.ownerEmail),
      notifiedTomorrow: expiringTomorrow.map((r) => r.ownerEmail),
    });
  } catch (e) {
    console.error("❌ Cleanup API error:", e);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
