import { bork_urls } from "@/app/constants/pcd";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { environment, namespace, tag, userEmail } = body;

    const cleanTag = tag?.trim();

    // 🔍 Log userEmail and input
    if (userEmail) {
      console.log(`[INFO] Tag removal requested by: ${userEmail}`);
    } else {
      console.warn("[WARN] No userEmail provided in request body");
    }

    if (!environment || !namespace || !cleanTag) {
      console.warn(
        `[WARN] Missing required fields. Received: ${JSON.stringify(body)}`
      );
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const baseURL = bork_urls[environment];
    const regionDomain = baseURL.replace("bork", namespace);

    // Step 1: Fetch current metadata
    console.log(`[INFO] Fetching current metadata for region: ${regionDomain}`);
    const res = await fetch(
      `${baseURL}/api/v1/regions/${regionDomain}/metadata`
    );
    const text = await res.text();

    if (!res.ok) {
      console.error(`[ERROR] Failed to fetch metadata. Response: ${text}`);
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
        console.error(`[ERROR] JSON parse error: ${err.message}`);
      } else {
        console.error("[ERROR] Unknown error while parsing JSON:", err);
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

    console.log(
      `[INFO] Updating metadata for ${regionDomain}. Removed tag: "${cleanTag}". New tags: ${updatedTags.join(
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
      console.error(`[ERROR] Failed to update metadata: ${errorText}`);
      return NextResponse.json(
        { message: "Failed to update metadata" },
        { status: 500 }
      );
    }

    console.log(`[SUCCESS] Tag "${cleanTag}" removed successfully.`);
    return NextResponse.json({ message: "Tag removed", tags: updatedTags });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Unhandled error during tag removal:", err.message);
    } else {
      console.error("Unknown unhandled error:", err);
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
