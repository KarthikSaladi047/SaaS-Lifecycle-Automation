import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { environmentOptions, log } from "@/app/constants/pcd";

interface CustomerItem {
  shortname: string;
  admin_email: string;
}

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

    const response = await axios.get(
      `${selectedEnv.borkUrl}/api/v1/customers/`
    );
    const items = response.data.items;

    log.info(` Retrieved ${items.length} customers from ${env}`);

    const filteredResponse = items.map((item: CustomerItem) => ({
      shortname: item.shortname,
      admin_email: item.admin_email,
    }));

    log.success(`Returning ${filteredResponse.length} filtered customers`);
    return NextResponse.json(filteredResponse);
  } catch (error: unknown) {
    if (error instanceof Error) {
      log.error(`Failed to fetch customers: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    log.warn("Unknown error occurred while fetching customers");
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
