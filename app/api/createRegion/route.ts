import { NextRequest, NextResponse } from "next/server";
import https from "https";
import fs from "fs/promises";
import { bork_urls } from "@/app/constants/pcd";

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

    // 🔍 Track request initiator
    if (userEmail) {
      console.log(`[INFO] Region deploy requested by userEmail: ${userEmail}`);
    } else {
      console.warn("[WARN] No userEmail provided in request body");
    }

    const getTokenFromSecret = async (env: string) => {
      const secretPath = `/var/run/secrets/platform9/${env}-bork-token`;
      return (await fs.readFile(secretPath, "utf8")).trim();
    };

    const isInfra = !regionName;
    const borkToken = !token ? await getTokenFromSecret(environment) : token;

    const baseURL = bork_urls[environment];
    const regionPrefix = isInfra ? shortName : `${shortName}-${regionName}`;
    const regionDomain = baseURL.replace("bork", regionPrefix);

    // Step 1: Create Customer (only for Infra)
    if (isInfra) {
      console.log(`[INFO] Creating customer: ${shortName}`);
      const createCustomer = await fetch(
        `${baseURL}/api/v1/customers/${shortName}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admin_email: adminEmail, aim: AIM }),
        }
      );
      if (!createCustomer.ok) {
        const errText = await createCustomer.text();
        console.error(`[ERROR] Customer creation failed: ${errText}`);
        throw new Error("Customer creation failed");
      }
    }

    // Step 2: Create Region
    console.log(`[INFO] Creating region: ${regionDomain}`);
    const createRegion = await fetch(
      `${baseURL}/api/v1/regions/${regionDomain}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: shortName }),
      }
    );
    if (!createRegion.ok) {
      const errText = await createRegion.text();
      console.error(`[ERROR] Region creation failed: ${errText}`);
      throw new Error("Region creation failed");
    }

    // Step 3: Deploy Region
    console.log(`[INFO] Deploying region: ${regionDomain}`);
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

      req.on("error", (err) => {
        console.error("[ERROR] HTTPS DEPLOY request failed:", err);
        reject(err);
      });

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
      console.error(
        `[ERROR] Deployment failed with status ${deployResponse.statusCode}: ${deployResponse.body}`
      );
      throw new Error(`Region deployment failed: ${deployResponse.body}`);
    }

    // Step 4: Add Metadata
    console.log(`[INFO] Adding metadata to region: ${regionDomain}`);
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

    if (!addMetadata.ok) {
      const errText = await addMetadata.text();
      console.error(`[ERROR] Metadata addition failed: ${errText}`);
      throw new Error("Metadata addition failed");
    }

    console.log(
      `[SUCCESS] Region ${regionName || "Infra"} deployed successfully.`
    );
    return NextResponse.json({
      message: `${
        regionName || "Infra"
      } region created and deployed successfully`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[FATAL] Region creation failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
