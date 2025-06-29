import { bork_urls, log } from "@/app/constants/pcd";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const environment = searchParams.get("env");
    const namespace = searchParams.get("namespace");

    log.info(
      `Reset state request received. env=${environment}, namespace=${namespace}`
    );

    if (!environment || !namespace) {
      log.warn("Missing required query parameters.");
      return NextResponse.json(
        { message: "Missing environment or namespace" },
        { status: 400 }
      );
    }

    const baseURL = bork_urls[environment];
    const regionDomain = baseURL.replace("bork", namespace);
    const stateURL = `${baseURL}/api/v1/regions/${regionDomain}/state`;

    log.info(` Sending POST to ${stateURL} with state=ready`);

    const res = await fetch(stateURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state: "ready" }),
    });

    const text = await res.text();

    if (!res.ok) {
      log.error(
        `Failed to reset region state. Status: ${res.status}, Body: ${text}`
      );
      return NextResponse.json(
        { message: `Failed to set region state: ${text}` },
        { status: res.status }
      );
    }

    log.success(` Region ${regionDomain} state reset to 'ready'`);
    return NextResponse.json({ message: "Region state reset to 'ready'" });
  } catch (e: unknown) {
    if (e instanceof Error) {
      log.error(`Error resetting task status: ${e.message}`);
    } else {
      log.error(`Unknown error resetting task status: ${e}`);
    }

    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
