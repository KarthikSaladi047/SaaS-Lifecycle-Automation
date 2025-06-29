import { bork_urls } from "@/app/constants/pcd";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const environment = searchParams.get("env");
    const namespace = searchParams.get("namespace");

    console.log(
      `[INFO] Reset state request received. env=${environment}, namespace=${namespace}`
    );

    if (!environment || !namespace) {
      console.warn("[WARN] Missing required query parameters.");
      return NextResponse.json(
        { message: "Missing environment or namespace" },
        { status: 400 }
      );
    }

    const baseURL = bork_urls[environment];
    const regionDomain = baseURL.replace("bork", namespace);
    const stateURL = `${baseURL}/api/v1/regions/${regionDomain}/state`;

    console.log(`[INFO] Sending POST to ${stateURL} with state=ready`);

    const res = await fetch(stateURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state: "ready" }),
    });

    const text = await res.text();

    if (!res.ok) {
      console.error(
        `[ERROR] Failed to reset region state. Status: ${res.status}, Body: ${text}`
      );
      return NextResponse.json(
        { message: `Failed to set region state: ${text}` },
        { status: res.status }
      );
    }

    console.log(`[SUCCESS] Region ${regionDomain} state reset to 'ready'`);
    return NextResponse.json({ message: "Region state reset to 'ready'" });
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("[FATAL] Error resetting task status:", e.message);
    } else {
      console.error("[FATAL] Unknown error resetting task status:", e);
    }

    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
