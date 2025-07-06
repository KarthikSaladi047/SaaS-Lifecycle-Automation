import { environmentOptions, log } from "@/app/constants/pcd";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { environment, fqdn, tag } = body;
    const cleanTag = tag?.trim();

    if (!environment || !fqdn || !cleanTag) {
      log.warn(`Missing required fields. Received: ${JSON.stringify(body)}`);
      return NextResponse.json(
        { error: "Missing required fields: environment, fqdn, tag" },
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

    // Step 1: Fetch current metadata
    log.info(`Fetching current metadata for region: ${fqdn}`);
    const res = await fetch(
      `${selectedEnv.borkUrl}/api/v1/regions/${fqdn}/metadata`
    );
    const text = await res.text();

    if (!res.ok) {
      log.error(`Failed to fetch metadata. Response: ${text}`);
      return NextResponse.json(
        { error: `Failed to fetch metadata: ${text}` },
        { status: res.status }
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unknown JSON parsing error";
      log.error(`JSON parse error: ${msg}`);
      return NextResponse.json(
        { error: "Failed to parse metadata response" },
        { status: 500 }
      );
    }

    const currentMetadata = data.details?.metadata || {};
    const existingTags = (currentMetadata.tags || "")
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);

    const updatedTags = existingTags.filter(
      (t: string) => t.toLowerCase() !== cleanTag.toLowerCase()
    );

    const updatedMetadata = {
      ...currentMetadata,
      tags: updatedTags.join(","),
    };

    log.info(
      `Updating metadata for ${fqdn}. Removed tag: "${cleanTag}". Remaining: ${updatedTags.join(
        ","
      )}`
    );

    // Step 3: POST updated metadata
    const updateRes = await fetch(
      `${selectedEnv.borkUrl}/api/v1/regions/${fqdn}/metadata`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: updatedMetadata }),
      }
    );

    const updateText = await updateRes.text();

    if (!updateRes.ok) {
      log.error(`Failed to update metadata: ${updateText}`);
      return NextResponse.json(
        { error: `Failed to update metadata: ${updateText}` },
        { status: updateRes.status }
      );
    }

    log.success(`Tag "${cleanTag}" removed successfully.`);
    return NextResponse.json({ message: "Tag removed", tags: updatedTags });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    log.error(`Unhandled error during tag removal: ${msg}`);
    return NextResponse.json(
      { error: `Server error: ${msg}` },
      { status: 500 }
    );
  }
}
