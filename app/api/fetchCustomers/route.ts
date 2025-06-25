import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const allowedEnvs = ["dev", "qa", "staging", "production"];

interface CustomerItem {
  shortname: string;
  admin_email: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const env = searchParams.get("env");

    if (!env || !allowedEnvs.includes(env)) {
      return NextResponse.json(
        { error: "Missing or invalid 'env' param" },
        { status: 400 }
      );
    }

    const apiUrl =
      env === "production"
        ? `https://bork.app.pcd.platform9.com/api/v1/customers/`
        : `https://bork.app.${env}-pcd.platform9.com/api/v1/customers/`;

    const response = await axios.get(apiUrl);
    const items = response.data.items;

    const filteredResponse = items.map((item: CustomerItem) => ({
      shortname: item.shortname,
      admin_email: item.admin_email,
    }));

    return NextResponse.json(filteredResponse);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
