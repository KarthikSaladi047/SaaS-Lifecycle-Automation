import { environmentOptions, log } from "@/app/constants/pcd";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { environment, shortName, regionName, leaseDate, note, userEmail } =
      body;

    if (userEmail) {
      log.info(`Lease update requested by userEmail: ${userEmail}`);
    } else {
      log.warn("No userEmail provided in lease update request.");
    }

    if (!environment || !leaseDate || !shortName || !regionName) {
      log.warn("Missing required fields in request body.");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const envObj = environmentOptions.find((env) => env.value === environment);
    if (!envObj?.borkUrl || !envObj.domain) {
      log.error(`Invalid environment: ${environment}`);
      return NextResponse.json(
        { error: "Invalid environment" },
        { status: 400 }
      );
    }

    const isInfra = regionName === "Infra";
    const regionPrefix = isInfra ? shortName : `${shortName}-${regionName}`;
    const regionDomain = `${regionPrefix}${envObj.domain}`;

    log.info(`Fetching current metadata for region: ${regionDomain}`);

    const res = await fetch(
      `${envObj.borkUrl}/api/v1/regions/${regionDomain}/metadata`
    );

    const text = await res.text();

    if (!res.ok) {
      log.warn(`Failed to fetch metadata: ${text}`);
      return NextResponse.json(
        { error: `Failed to fetch metadata: ${text}` },
        { status: res.status }
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      log.warn("Failed to parse metadata response.");
      return NextResponse.json(
        { error: "Failed to parse metadata response" },
        { status: 500 }
      );
    }

    const currentMetadata = data.details?.metadata || {};
    const currentCounter = parseInt(currentMetadata.lease_counter || "0", 10);

    const updatedMetadata = {
      ...currentMetadata,
      lease_date: leaseDate,
      lease_counter: String(currentCounter + 1),
      note,
    };

    log.info(
      `Updating metadata for region ${regionDomain} (lease_counter: ${currentCounter} -> ${
        currentCounter + 1
      })`
    );

    const updateRes = await fetch(
      `${envObj.borkUrl}/api/v1/regions/${regionDomain}/metadata`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: updatedMetadata }),
      }
    );

    const updateErrText = await updateRes.text();

    if (!updateRes.ok) {
      log.error(`Failed to update metadata: ${updateErrText}`);
      return NextResponse.json(
        { error: `Failed to update metadata: ${updateErrText}` },
        { status: updateRes.status }
      );
    }

    log.success(`Lease updated successfully for ${regionDomain}`);
    return NextResponse.json({ message: "Lease updated successfully" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error(`[FATAL] Error updating lease: ${msg}`);
    return NextResponse.json(
      { error: `Server error: ${msg}` },
      { status: 500 }
    );
  }
}
