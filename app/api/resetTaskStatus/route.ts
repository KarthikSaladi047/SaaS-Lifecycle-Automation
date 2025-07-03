import { environmentOptions, log } from "@/app/constants/pcd";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const environment = searchParams.get("env");
    const fqdn = searchParams.get("fqdn");

    log.info(`Reset state request received. env=${environment}, fqdn=${fqdn}`);

    if (!environment || !fqdn) {
      log.warn("[WARN] Missing required query parameters.");
      return NextResponse.json(
        { message: "Missing environment or fqdn" },
        { status: 400 }
      );
    }

    const selectedEnv = environmentOptions.find((e) => e.value === environment);

    if (!selectedEnv?.borkUrl) {
      log.error(`Invalid environment: ${environment}`);
      return NextResponse.json(
        { message: "Invalid environment" },
        { status: 400 }
      );
    }

    const stateURL = `${selectedEnv.borkUrl}/api/v1/regions/${fqdn}/state`;

    log.info(`Sending POST to ${stateURL} with state=ready`);

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

    log.success(`${fqdn} state reset to 'ready'`);
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
