import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { environmentOptions, log } from "@/app/constants/pcd";
import { ClusterItem } from "@/app/types/pcd";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const env = searchParams.get("env");

    if (!env) {
      log.warn("Missing 'env' query param in request");
      return NextResponse.json(
        { error: "Missing 'env' param" },
        { status: 400 }
      );
    }

    const selectedEnv = environmentOptions.find((e) => e.value === env);

    if (!selectedEnv?.borkUrl) {
      log.error(`Invalid environment value: ${env}`);
      return NextResponse.json(
        { error: "Invalid 'env' value" },
        { status: 400 }
      );
    }

    const response = await axios.get(`${selectedEnv.borkUrl}/api/v1/clusters/`);
    const items = response.data.items;

    log.info(` Retrieved ${items.length} clusters from ${env}`);

    const filteredResponse = items
      .filter((item: ClusterItem) => item.accepting)
      .map((item: ClusterItem) => ({
        fqdn: item.fqdn,
      }));

    log.success(`Returning ${filteredResponse.length} filtered clusters`);
    return NextResponse.json(filteredResponse);
  } catch (error: unknown) {
    if (error instanceof Error) {
      log.error(`Failed to fetch clusters: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    log.warn("Unknown error occurred while fetching clusters");
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
