import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { environmentOptions } from "@/app/constants/pcd";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  const env = searchParams.get("env");

  if (!query || !env) {
    return NextResponse.json(
      { error: "Missing query or env parameter" },
      { status: 400 }
    );
  }

  const selectedEnv = environmentOptions.find((e) => e.value === env);
  if (!selectedEnv) {
    return NextResponse.json({ error: "Invalid environment" }, { status: 400 });
  }

  const { cortexUrl, cortex_user } = selectedEnv;

  let cortex_password: string;
  try {
    cortex_password = (
      await fs.readFile(
        `/var/run/secrets/platform9/cortex/${cortex_user}`,
        "utf8"
      )
    ).trim();
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to read cortex password",
        details: (err as Error).message,
      },
      { status: 500 }
    );
  }

  const basicAuthHeader =
    "Basic " +
    Buffer.from(`${cortex_user}:${cortex_password}`).toString("base64");

  try {
    const cortexRes = await fetch(
      `${cortexUrl}/api/prom/api/v1/query?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: basicAuthHeader,
        },
      }
    );

    const data = await cortexRes.json();

    if (!cortexRes.ok) {
      return NextResponse.json(
        { error: data.error || "Cortex query failed" },
        { status: cortexRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: (err as Error).message },
      { status: 500 }
    );
  }
}
