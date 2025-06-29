import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { bork_urls } from "@/app/constants/pcd";

interface CustomerItem {
  shortname: string;
  admin_email: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const env = searchParams.get("env");

    console.log(`[INFO] Incoming GET /customers request with env: ${env}`);

    if (!env) {
      console.warn("[WARN] Missing 'env' query param in request");
      return NextResponse.json(
        { error: "Missing 'env' param" },
        { status: 400 }
      );
    }

    const baseURL = bork_urls[env];
    console.log(`[INFO] Fetching customers from: ${baseURL}/api/v1/customers/`);

    const response = await axios.get(`${baseURL}/api/v1/customers/`);
    const items = response.data.items;

    console.log(`[INFO] Retrieved ${items.length} customers from ${env}`);

    const filteredResponse = items.map((item: CustomerItem) => ({
      shortname: item.shortname,
      admin_email: item.admin_email,
    }));

    console.log(
      `[SUCCESS] Returning ${filteredResponse.length} filtered customers`
    );
    return NextResponse.json(filteredResponse);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`[ERROR] Failed to fetch customers: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error("[ERROR] Unknown error occurred while fetching customers");
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
