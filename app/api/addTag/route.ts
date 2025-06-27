import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { environment, namespace, tag } = body;

    if (!environment || !namespace || !tag) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const baseURL =
      environment === "production"
        ? "https://bork.app.pcd.platform9.com/api/v1"
        : `https://bork.app.${environment}-pcd.platform9.com/api/v1`;

    const regionDomain =
      environment === "production"
        ? `${namespace}.app.pcd.platform9.com`
        : `${namespace}.app.${environment}-pcd.platform9.com`;

    // Step 1: Fetch current metadata
    const res = await fetch(`${baseURL}/regions/${regionDomain}/metadata`);
    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { message: "Failed to fetch metadata" },
        { status: 500 }
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { message: "Failed to parse metadata response" },
        { status: 500 }
      );
    }

    const currentMetadata = data.details?.metadata || {};

    // Step 2: Merge tag as comma-separated string
    const existingTags = (currentMetadata.tags || "")
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);

    const updatedTags = Array.from(new Set([...existingTags, tag]));

    const updatedMetadata = {
      ...currentMetadata,
      tags: updatedTags.join(","),
    };

    // Step 3: POST updated metadata
    const updateRes = await fetch(
      `${baseURL}/regions/${regionDomain}/metadata`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: updatedMetadata }),
      }
    );

    if (!updateRes.ok) {
      return NextResponse.json(
        { message: "Failed to update metadata" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Tag added", tags: updatedTags });
  } catch (e) {
    console.error("Error adding tag:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
