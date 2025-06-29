import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { environment, shortName, regionName, leaseDate, note } = body;

    if (!environment || !leaseDate || !shortName || !regionName) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const isInfra = regionName === "Infra";

    const baseURL =
      environment === "production"
        ? "https://bork.app.pcd.platform9.com"
        : `https://bork.app.${environment}-pcd.platform9.com`;

    const regionDomain =
      environment === "production"
        ? `${shortName}${isInfra ? "" : `-${regionName}`}.app.pcd.platform9.com`
        : `${shortName}${
            isInfra ? "" : `-${regionName}`
          }.app.${environment}-pcd.platform9.com`;

    // Step 1: Fetch current metadata
    const res = await fetch(
      `${baseURL}/api/v1/regions/${regionDomain}/metadata`
    );
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
    const currentCounter = parseInt(currentMetadata.lease_counter || "0", 10);

    // Step 2: Prepare updated metadata
    const updatedMetadata = {
      ...currentMetadata,
      lease_date: leaseDate,
      lease_counter: String(currentCounter + 1),
      note: note,
    };

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
      return NextResponse.json(
        { message: "Failed to update metadata" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Lease updated successfully",
      lease_counter: updatedMetadata.lease_counter,
      lease_date: updatedMetadata.lease_date,
    });
  } catch (e) {
    console.error("Error updating lease:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
