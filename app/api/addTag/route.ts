import { environmentOptions, log } from "@/app/constants/pcd";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { environment, fqdn, tag, userEmail } = body;

    if (userEmail) {
      log.info(`Tag update requested by: ${userEmail}`);
    } else {
      log.warn("No userEmail provided in request body");
    }

    if (!environment || !fqdn || !tag) {
      log.warn(`Missing required fields. Body: ${JSON.stringify(body)}`);
      return NextResponse.json(
        { message: "Missing required fields" },
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

    // Step 1: Fetch current metadata
    log.info(` Fetching metadata for region: ${fqdn}`);
    const res = await fetch(
      `${selectedEnv.borkUrl}/api/v1/regions/${fqdn}/metadata`
    );
    const text = await res.text();

    if (!res.ok) {
      log.error(`Failed to fetch metadata. Response: ${text}`);
      return NextResponse.json(
        { message: "Failed to fetch metadata" },
        { status: 500 }
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (err: unknown) {
      if (err instanceof Error) {
        log.warn(`Failed to parse metadata response: ${err.message}`);
      } else {
        log.warn(`Unknown error while parsing metadata: ${err}`);
      }
      return NextResponse.json(
        { message: "Failed to parse metadata response" },
        { status: 500 }
      );
    }

    const currentMetadata = data.details?.metadata || {};

    // Step 2: Merge tag
    const existingTags = (currentMetadata.tags || "")
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);

    const updatedTags = Array.from(new Set([...existingTags, tag]));
    const updatedMetadata = {
      ...currentMetadata,
      tags: updatedTags.join(","),
    };

    log.info(`Updating tags for ${fqdn} to: ${updatedTags.join(",")}`);

    // Step 3: POST updated metadata
    const updateRes = await fetch(
      `${selectedEnv.borkUrl}/api/v1/regions/${fqdn}/metadata`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: updatedMetadata }),
      }
    );

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      log.error(`Failed to update metadata: ${errorText}`);
      return NextResponse.json(
        { message: "Failed to update metadata" },
        { status: 500 }
      );
    }

    log.success(`Tag "${tag}" added successfully for ${fqdn}`);
    return NextResponse.json({ message: "Tag added", tags: updatedTags });
  } catch (e) {
    log.error(`Unhandled error in tag update: ${e}`);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
