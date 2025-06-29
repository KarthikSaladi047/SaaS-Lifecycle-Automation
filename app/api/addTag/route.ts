import { bork_urls, log } from "@/app/constants/pcd";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { environment, namespace, tag, userEmail } = body;

    // 🔍 Log userEmail for tracking
    if (userEmail) {
      log.info(`Tag update requested by: ${userEmail}`);
    } else {
      log.warn("No userEmail provided in request body");
    }

    if (!environment || !namespace || !tag) {
      log.warn(`Missing required fields. Body: ${JSON.stringify(body)}`);
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const baseURL = bork_urls[environment];
    const regionDomain = baseURL.replace("bork", namespace);

    // Step 1: Fetch current metadata
    log.info(` Fetching metadata for region: ${regionDomain}`);
    const res = await fetch(
      `${baseURL}/api/v1/regions/${regionDomain}/metadata`
    );

    const data = await res.json();

    if (!res.ok) {
      log.error(`Failed to fetch metadata. Response: ${data}`);
      return NextResponse.json(
        { message: "Failed to fetch metadata" },
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

    log.info(`Updating tags for ${regionDomain} to: ${updatedTags.join(",")}`);

    // Step 3: POST updated metadata
    const updateRes = await fetch(
      `${baseURL}/api/v1/regions/${regionDomain}/metadata`,
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

    log.success(`Tag "${tag}" added successfully for ${regionDomain}`);
    return NextResponse.json({ message: "Tag added", tags: updatedTags });
  } catch (e) {
    log.error(`Unhandled error in tag update: ${e}`);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
