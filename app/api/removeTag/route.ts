import { bork_urls, log } from "@/app/constants/pcd";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { environment, namespace, tag, userEmail } = body;

    const cleanTag = tag?.trim();

    // 🔍 Log userEmail and input
    if (userEmail) {
      log.info(` Tag removal requested by: ${userEmail}`);
    } else {
      log.warn("No userEmail provided in request body");
    }

    if (!environment || !namespace || !cleanTag) {
      log.warn(`Missing required fields. Received: ${JSON.stringify(body)}`);
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const baseURL = bork_urls[environment];
    const regionDomain = baseURL
      .replace("https://", "")
      .replace("bork", namespace);

    // Step 1: Fetch current metadata
    log.info(` Fetching current metadata for region: ${regionDomain}`);
    const res = await fetch(
      `${baseURL}/api/v1/regions/${regionDomain}/metadata`
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
        log.error(`JSON parse error: ${err.message}`);
      } else {
        log.warn(`Unknown error while parsing JSON: ${err}`);
      }
      return NextResponse.json(
        { message: "Failed to parse metadata response" },
        { status: 500 }
      );
    }

    const currentMetadata = data.details?.metadata || {};

    // Step2: Demerge Tag
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
      `Updating metadata for ${regionDomain}. Removed tag: "${cleanTag}". New tags: ${updatedTags.join(
        ","
      )}`
    );

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

    log.success(` Tag "${cleanTag}" removed successfully.`);
    return NextResponse.json({ message: "Tag removed", tags: updatedTags });
  } catch (err: unknown) {
    if (err instanceof Error) {
      log.error(`Unhandled error during tag removal: ${err.message}`);
    } else {
      log.error(`Unknown unhandled error: ${err}`);
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
