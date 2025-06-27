import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { GroupedData, APIItem } from "@/app/types/pcd";

// Allowed environments
const allowedEnvs = ["dev", "qa", "staging", "production"];

async function fetchAPIData(env: string): Promise<GroupedData[]> {
  const apiUrl =
    env === "production"
      ? "https://bork.app.pcd.platform9.com/api/v1/regions"
      : `https://bork.app.${env}-pcd.platform9.com/api/v1/regions`;

  const response = await axios.get(apiUrl, { params: { env } });
  const items: APIItem[] = response.data.items;
  const groupedMap: Record<string, GroupedData> = {};

  for (const item of items) {
    if (!item.customer_shortname || !item.region_name || !item.fqdn) continue;
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
  return Object.values(groupedMap).sort((a, b) =>
    a.customer.localeCompare(b.customer)
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const env = searchParams.get("env");

  if (!env || !allowedEnvs.includes(env)) {
    return NextResponse.json(
      { error: "Missing or invalid 'env' param" },
      { status: 400 }
    );
  }

  try {
    const data = await fetchAPIData(env);
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Handler Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch or process data" },
      { status: 500 }
    );
  }
}
