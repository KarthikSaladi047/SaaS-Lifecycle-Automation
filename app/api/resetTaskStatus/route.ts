import { environmentOptions, log } from "@/app/constants/pcd";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const environment = searchParams.get("env");
    const fqdn = searchParams.get("fqdn");

    log.info(`Reset state request received. env=${environment}, fqdn=${fqdn}`);

    if (!environment || !fqdn) {
      log.warn("Missing required query parameters.");
      return NextResponse.json(
        { error: "Missing 'environment' or 'fqdn'" },
        { status: 400 }
      );
    }

    const selectedEnv = environmentOptions.find((e) => e.value === environment);

    if (!selectedEnv?.borkUrl) {
      log.error(`Invalid environment: ${environment}`);
      return NextResponse.json(
        { error: "Invalid environment" },
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

    const responseText = await res.text();

    if (!res.ok) {
      log.error(
        `Failed to reset region state. Status: ${res.status}, Body: ${responseText}`
      );
      return NextResponse.json(
        { error: `Failed to set region state: ${responseText}` },
        { status: res.status }
      );
    }

    log.success(`${fqdn} state reset to 'ready'`);
    return NextResponse.json({ message: "Region state reset to 'ready'" });
  } catch (e: unknown) {
    const errorMessage =
      e instanceof Error ? e.message : "Unexpected error occurred";
    log.error(`Error resetting region state: ${errorMessage}`);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
