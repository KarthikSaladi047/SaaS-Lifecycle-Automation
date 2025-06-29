import { NextRequest, NextResponse } from "next/server";
import https from "https";

const AIM = "opencloud";
const MULTI_REGION = true;

export async function POST(req: NextRequest) {
  try {
    const {
      environment,
      shortName,
      regionName,
      adminEmail,
      adminPassword,
      dbBackend,
      charturl,
      leaseDate,
      userEmail,
      use_du_specific_le_http_cert,
      token,
      tags,
    } = await req.json();

    const isInfra = !regionName;
    const borkToken = environment === "production" ? token : "";

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

    // Step 1: Create Customer (only for Infra)
    if (isInfra) {
      const createCustomer = await fetch(
        `${baseURL}/api/v1/customers/${shortName}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admin_email: adminEmail, aim: AIM }),
        }
      );
      if (!createCustomer.ok) throw new Error("Customer creation failed");
    }

    // Step 2: Create Region
    const createRegion = await fetch(
      `${baseURL}/api/v1/regions/${regionDomain}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: shortName }),
      }
    );
    if (!createRegion.ok) throw new Error("Region creation failed");

    // Step 3: Deploy Region
    const deployResponse = await new Promise<{
      statusCode: number;
      body: string;
    }>((resolve, reject) => {
      const req = https.request(
        {
          hostname: new URL(baseURL).hostname,
          path: `/api/v1/regions/${regionDomain}`,
          method: "DEPLOY",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${borkToken}`,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () =>
            resolve({ statusCode: res.statusCode || 500, body: data })
          );
        }
      );

      req.on("error", (err) => reject(err));
      req.write(
        JSON.stringify({
          admin_password: adminPassword,
          aim: AIM,
          dbbackend: dbBackend,
          regionname: isInfra ? "Infra" : regionName,
          options: {
            multi_region: MULTI_REGION.toString(),
            skip_components: "",
            chart_url: charturl,
          },
          ...(use_du_specific_le_http_cert && {
            use_du_specific_le_http_cert: true,
          }),
        })
      );
      req.end();
    });

    if (deployResponse.statusCode >= 400) {
      throw new Error(`Region deployment failed: ${deployResponse.body}`);
    }

    // Step 4: Add Metadata
    const addMetadata = await fetch(
      `${baseURL}/api/v1/regions/${regionDomain}/metadata`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            owner: userEmail,
            lease_date: leaseDate,
            tags,
            lease_counter: "0",
          },
        }),
      }
    );
    if (!addMetadata.ok) throw new Error("Metadata addition failed");

    return NextResponse.json({
      message: `${regionName} region created and deployed successfully`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
