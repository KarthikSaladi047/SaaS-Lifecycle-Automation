import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { environmentOptions, log } from "@/app/constants/pcd";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  const env = searchParams.get("env");

  if (!query || !env) {
    log.warn(`Missing query or env: query=${query}, env=${env}`);
    return NextResponse.json(
      { error: "Missing query or env parameter" },
      { status: 400 }
    );
  }

  const selectedEnv = environmentOptions.find((e) => e.value === env);
  if (!selectedEnv) {
    log.error(`Invalid environment: ${env}`);
    return NextResponse.json({ error: "Invalid environment" }, { status: 400 });
  }

  const { cortexUrl, cortex_user } = selectedEnv;
  const secretPath = `/var/run/secrets/platform9/cortex/${cortex_user}`;

  let cortex_password: string;
  try {
    cortex_password = (await fs.readFile(secretPath, "utf8")).trim();
  } catch (err) {
    log.error(
      `Failed to read secret for ${cortex_user}: ${(err as Error).message}`
    );
    return NextResponse.json(
      { error: "Failed to read cortex password" },
      { status: 500 }
    );
  }

  const basicAuthHeader =
    "Basic " +
    Buffer.from(`${cortex_user}:${cortex_password}`).toString("base64");

  const encodedQuery = encodeURIComponent(query);
  const cortexQueryUrl = `${cortexUrl}/api/prom/api/v1/query?query=${encodedQuery}`;

  try {
    log.info(`Running Cortex query for env=${env}: ${query}`);

    const cortexRes = await fetch(cortexQueryUrl, {
      headers: {
        Authorization: basicAuthHeader,
      },
    });

    const data = await cortexRes.json();

    if (!cortexRes.ok) {
      log.error(`Cortex query failed for env=${env}: ${query}`);
      return NextResponse.json(
        { error: data.error || "Cortex query failed" },
        { status: cortexRes.status }
      );
    }

    log.info(`Cortex query succeeded for env=${env}: ${query}`);
    return NextResponse.json(data);
  } catch (err) {
    log.error(
      `Unexpected error during Cortex query: ${(err as Error).message}`
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
