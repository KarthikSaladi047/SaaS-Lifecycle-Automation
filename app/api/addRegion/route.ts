import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";

const AIM = "opencloud";
const MULTI_REGION = true;

const getTokenFromSecret = async (environment: string) => {
  const secretPath = `/var/run/secrets/platform9/${environment}-bork-token`;
  return (await fs.readFile(secretPath, "utf8")).trim();
};

export async function POST(req: NextRequest) {
  try {
    const {
      environment,
      shortName,
      adminPassword,
      dbBackend,
      charturl,
      leaseDate,
      userEmail,
      use_du_specific_le_http_cert,
    } = await req.json();

    const token = await getTokenFromSecret(environment);
    const region = shortName;

    const baseURL =
      environment === "production"
        ? "https://bork.app.pcd.platform9.com/api/v1"
        : `https://bork.app.${environment}-pcd.platform9.com/api/v1`;

    const regionDomain =
      environment === "production"
        ? `${region}.app.pcd.platform9.com`
        : `${region}.app.${environment}-pcd.platform9.com`;

    // 1. Create Region
    const createRegion = await fetch(`${baseURL}/regions/${regionDomain}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer: shortName }),
    });
    if (!createRegion.ok) throw new Error("Region creation failed");

    // 2. Deploy Region
    const deployRegion = await fetch(`${baseURL}/regions/${regionDomain}`, {
      method: "DEPLOY", // Assumes DEPLOY is supported by backend
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        admin_password: adminPassword,
        aim: AIM,
        dbbackend: dbBackend,
        regionname: region,
        use_du_specific_le_http_cert,
        options: {
          multi_region: MULTI_REGION,
          skip_components: "",
          chart_url: charturl,
        },
      }),
    });
    if (!deployRegion.ok) throw new Error("Region deployment failed");

    // 3. Add Metadata
    const addMetadata = await fetch(
      `${baseURL}/regions/${regionDomain}/metadata`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            owner: userEmail,
            lease_date: leaseDate,
          },
        }),
      }
    );
    if (!addMetadata.ok) throw new Error("Metadata addition failed");

    return NextResponse.json({ message: "New region added successfully" });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
