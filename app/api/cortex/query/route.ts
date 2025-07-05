import { NextRequest, NextResponse } from "next/server";

const CORTEX_URL = process.env.CORTEX_URL!;
const CORTEX_USERNAME = process.env.CORTEX_USERNAME!;
const CORTEX_PASSWORD = process.env.CORTEX_PASSWORD!;

const basicAuthHeader =
  "Basic " +
  Buffer.from(`${CORTEX_USERNAME}:${CORTEX_PASSWORD}`).toString("base64");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      { error: "Missing query parameter" },
      { status: 400 }
    );
  }

  try {
    const cortexRes = await fetch(
      `${CORTEX_URL}/api/v1/query?query=${encodeURIComponent(query)}`,
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

/* 
fetch('/api/cortex/query?query=' + encodeURIComponent(`resmgr_total_number_of_hosts{du="karthik-cse-ks-one.app.qa-pcd.platform9.com", host_type="all_hosts"}`))
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(console.error);
  */
