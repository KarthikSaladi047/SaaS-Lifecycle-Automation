import { environmentOptions, log } from "@/app/constants/pcd";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { environment, shortName, regionName, leaseDate, note, userEmail } =
      body;

    if (userEmail) {
      log.info(` Lease update requested by userEmail: ${userEmail}`);
    } else {
      log.warn("No userEmail provided in lease update request.");
    }

    if (!environment || !leaseDate || !shortName || !regionName) {
      log.warn("Missing required fields in request body.");
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const envObj = environmentOptions.find((env) => env.value === environment);
    if (!envObj?.borkUrl || !envObj.domain) {
      log.error(`Invalid environment: ${environment}`);
      return NextResponse.json(
        { message: "Invalid environment" },
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
        { message: "Failed to fetch metadata" },
        { status: 500 }
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      log.warn("Failed to parse metadata response.");
      return NextResponse.json(
        { message: "Failed to parse metadata response" },
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

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      log.error(`Failed to update metadata: ${errText}`);
      return NextResponse.json(
        { message: "Failed to update metadata" },
        { status: 500 }
      );
    }

    log.success(`Lease updated successfully for ${regionDomain}`);
    return NextResponse.json({ message: "Lease updated successfully" });
  } catch (e: unknown) {
    if (e instanceof Error) {
      log.error(`[FATAL] Error updating lease: ${e.message}`);
    } else {
      log.error(`[FATAL] Unknown error updating lease: ${e}`);
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
