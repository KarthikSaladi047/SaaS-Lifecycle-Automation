import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const environment = searchParams.get("env");
    const namespace = searchParams.get("namespace");

    if (!environment || !namespace) {
      return NextResponse.json(
        { message: "Missing environment or namespace" },
        { status: 400 }
      );
    }

    const baseURL =
      environment === "production"
        ? "https://bork.app.pcd.platform9.com"
        : `https://bork.app.${environment}-pcd.platform9.com`;

    const regionDomain =
      environment === "production"
        ? `${namespace}.app.pcd.platform9.com`
        : `${namespace}.app.${environment}-pcd.platform9.com`;

    const stateURL = `${baseURL}/api/v1/regions/${regionDomain}/state`;

    const res = await fetch(stateURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state: "ready" }),
    });

    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { message: `Failed to set region state: ${text}` },
        { status: res.status }
      );
    }

    return NextResponse.json({ message: "Region state reset to 'ready'" });
  } catch (e) {
    console.error("Error resetting task status:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
