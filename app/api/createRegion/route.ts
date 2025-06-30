import { NextRequest, NextResponse } from "next/server";
import https from "https";
import fs from "fs/promises";
import { bork_urls, log } from "@/app/constants/pcd";

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

    // Normalize key fields
    const normalizedShortName = shortName.trim().toLowerCase();
    const normalizedRegionName = regionName?.trim().toLowerCase();
    const normalizedAdminEmail = adminEmail.trim().toLowerCase();

    // Log userEmail
    if (userEmail) {
      log.info(`Region deploy requested by userEmail: ${userEmail}`);
    } else {
      log.warn("No userEmail provided in request body");
    }

    const getTokenFromSecret = async (env: string) => {
      const secretPath = `/var/run/secrets/platform9/${env}-bork-token`;
      return (await fs.readFile(secretPath, "utf8")).trim();
    };

    const isInfra = !normalizedRegionName;
    const borkToken = !token ? await getTokenFromSecret(environment) : token;

    const baseURL = bork_urls[environment];
    const regionPrefix = isInfra
      ? normalizedShortName
      : `${normalizedShortName}-${normalizedRegionName}`;
    const regionDomain = baseURL
      .replace("https://", "")
      .replace("bork", regionPrefix);

    // Step 1: Create Customer (Infra only)
    if (isInfra) {
      log.info(`Creating customer: ${normalizedShortName}`);
      const createCustomer = await fetch(
        `${baseURL}/api/v1/customers/${normalizedShortName}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admin_email: normalizedAdminEmail, aim: AIM }),
        }
      );
      if (!createCustomer.ok) {
        const errText = await createCustomer.text();
        log.error(`Customer creation failed: ${errText}`);
        throw new Error("Customer creation failed");
      }
    }

    // Step 2: Create Region
    log.info(`Creating region: ${regionDomain}`);
    const createRegion = await fetch(
      `${baseURL}/api/v1/regions/${regionDomain}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: normalizedShortName }),
      }
    );
    if (!createRegion.ok) {
      const errText = await createRegion.text();
      log.error(`Region creation failed: ${errText}`);
      throw new Error("Region creation failed");
    }

    // Step 3: DEPLOY Region (custom HTTPS method)
    log.info(`Deploying region: ${regionDomain}`);
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
        log.error(`DEPLOY request failed: ${err}`);
        reject(err);
      });

      req.write(
        JSON.stringify({
          admin_password: adminPassword,
          aim: AIM,
          dbbackend: dbBackend,
          regionname: isInfra ? "Infra" : normalizedRegionName,
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
      log.error(
        `Deployment failed (${deployResponse.statusCode}): ${deployResponse.body}`
      );
      throw new Error(`Region deployment failed`);
    }

    // Step 4: Add Metadata
    log.info(`Adding metadata to region: ${regionDomain}`);
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
      log.error(`Metadata addition failed: ${errText}`);
      throw new Error("Metadata addition failed");
    }

    log.success(
      `Region ${normalizedRegionName || "Infra"} deployed successfully.`
    );
    return NextResponse.json({
      message: `${
        normalizedRegionName || "Infra"
      } region created and deployed successfully`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error(`Region creation failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
