import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { GroupedData, APIItem } from "@/app/types/pcd";
import { bork_urls, log } from "@/app/constants/pcd";

async function fetchAPIData(env: string): Promise<GroupedData[]> {
  const baseURL = bork_urls[env];

  log.info(` Fetching regions from: ${baseURL}/api/v1/regions`);

  const response = await axios.get(`${baseURL}/api/v1/regions`, {
    params: { env },
  });

  const items: APIItem[] = response.data.items;
  log.info(` Retrieved ${items.length} region records`);

  const groupedMap: Record<string, GroupedData> = {};

  for (const item of items) {
    if (!item.customer_shortname || !item.region_name || !item.fqdn) {
      log.warn(`Skipping incomplete item: ${JSON.stringify(item)}`);
      continue;
    }

    const customer = item.customer_shortname.trim().toLowerCase();

    if (!groupedMap[customer]) {
      groupedMap[customer] = { customer, regions: [] };
    }

    groupedMap[customer].regions.push({
      region_name: item.region_name,
      fqdn: item.fqdn,
      namespace: item.namespace,
      task_state: item.task_state,
      deployed_at: item.deployed_at,
      chart_url: item.options?.chart_url || "",
      owner: item.metadata?.owner || "",
      use_du_specific_le_http_cert:
        item.metadata?.use_du_specific_le_http_cert || "false",
      lease_date: item.metadata?.lease_date || "",
      lease_counter: item.metadata?.lease_counter || "0",
      tags: item.metadata?.tags || "",
    });
  }

  const result = Object.values(groupedMap).sort((a, b) =>
    a.customer.localeCompare(b.customer)
  );

  log.success(` Grouped data for ${result.length} customers`);
  return result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const env = searchParams.get("env");

  log.info(` GET /regions called with env: ${env}`);

  if (!env) {
    log.warn("Missing 'env' param in request");
    return NextResponse.json({ error: "Missing 'env' param" }, { status: 400 });
  }

  try {
    const data = await fetchAPIData(env);
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(
        `[ERROR] Failed to fetch/process regions: ${error.message}`
      );
    } else {
      console.error(
        "[ERROR] Unknown error occurred while fetching regions:",
        error
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch or process data" },
      { status: 500 }
    );
  }
}
