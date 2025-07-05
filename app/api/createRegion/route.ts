import { environmentOptions, log } from "@/app/constants/pcd";
import { NextRequest, NextResponse } from "next/server";
import https from "https";
import fs from "fs/promises";

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
      cluster,
      charturl,
      leaseDate,
      userEmail,
      use_du_specific_le_http_cert,
      token,
      tags,
    } = await req.json();

    const normalizedShortName = shortName.trim().toLowerCase();
    const normalizedRegionName = regionName?.trim().toLowerCase();
    const normalizedAdminEmail = adminEmail.trim().toLowerCase();

    if (userEmail) {
      log.info(`Region deploy requested by userEmail: ${userEmail}`);
    } else {
      log.warn("No userEmail provided in request body");
    }

    // Validate environment
    const selectedEnv = environmentOptions.find((e) => e.value === environment);
    if (!selectedEnv?.borkUrl || !selectedEnv?.domain) {
      log.error(`Invalid environment: ${environment}`);
      return NextResponse.json(
        { error: "Invalid environment" },
        { status: 400 }
      );
    }

    const isInfra = !normalizedRegionName;
    const borkToken =
      token ||
      (
        await fs.readFile(
          `/var/run/secrets/platform9/${environment}-bork-token`,
          "utf8"
        )
      ).trim();

    const regionPrefix = isInfra
      ? normalizedShortName
      : `${normalizedShortName}-${normalizedRegionName}`;
    const regionDomain = `${regionPrefix}${selectedEnv.domain}`;

    // Step 1: Create Customer (only for Infra)
    if (isInfra) {
      log.info(`Creating customer: ${normalizedShortName}`);
      const res = await fetch(
        `${selectedEnv.borkUrl}/api/v1/customers/${normalizedShortName}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admin_email: normalizedAdminEmail, aim: AIM }),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        log.error(`Customer creation failed: ${errText}`);
        return NextResponse.json(
          { error: `Customer creation failed: ${errText}` },
          { status: res.status }
        );
      }
    }

    // Step 2: Create Region
    log.info(`Creating region: ${regionDomain}`);
    const regionRes = await fetch(
      `${selectedEnv.borkUrl}/api/v1/regions/${regionDomain}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: normalizedShortName }),
      }
    );
    if (!regionRes.ok) {
      const errText = await regionRes.text();
      log.error(`Region creation failed: ${errText}`);
      return NextResponse.json(
        { error: `Region creation failed: ${errText}` },
        { status: regionRes.status }
      );
    }

    // Step 3: DEPLOY Region
    log.info(`Deploying region: ${regionDomain}`);
    const deployResponse = await new Promise<{
      statusCode: number;
      body: string;
    }>((resolve, reject) => {
      const reqDeploy = https.request(
        {
          hostname: new URL(selectedEnv.borkUrl).hostname,
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

      reqDeploy.on("error", (err) => {
        log.error(`DEPLOY request failed: ${err}`);
        reject(err);
      });

      reqDeploy.write(
        JSON.stringify({
          admin_password: adminPassword,
          aim: cluster ?? AIM,
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

      reqDeploy.end();
    });

    if (deployResponse.statusCode >= 400) {
      log.error(
        `Deployment failed (${deployResponse.statusCode}): ${deployResponse.body}`
      );
      return NextResponse.json(
        {
          error: `Deployment failed (${deployResponse.statusCode}): ${deployResponse.body}`,
        },
        { status: deployResponse.statusCode }
      );
    }

    // Step 4: Add Metadata
    log.info(`Adding metadata to region: ${regionDomain}`);
    const metadataRes = await fetch(
      `${selectedEnv.borkUrl}/api/v1/regions/${regionDomain}/metadata`,
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

    if (!metadataRes.ok) {
      const errText = await metadataRes.text();
      log.error(`Metadata addition failed: ${errText}`);
      return NextResponse.json(
        { error: `Metadata addition failed: ${errText}` },
        { status: metadataRes.status }
      );
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
