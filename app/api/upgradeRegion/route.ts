import { environmentOptions, log } from "@/app/constants/pcd";
import { NextRequest, NextResponse } from "next/server";
import https from "https";
import fs from "fs/promises";

export async function POST(req: NextRequest) {
  try {
    const {
      environment,
      shortName,
      regionName,
      charturl,
      use_du_specific_le_http_cert,
      token,
      userEmail,
    } = await req.json();

    if (userEmail) {
      log.info(`Upgrade requested by userEmail: ${userEmail}`);
    } else {
      log.warn("No userEmail provided in upgrade request");
    }

    const selectedEnv = environmentOptions.find((e) => e.value === environment);
    if (!selectedEnv) {
      log.error(`Invalid environment: ${environment}`);
      return NextResponse.json(
        { error: "Invalid environment" },
        { status: 400 }
      );
    }

    const isInfra = regionName === "Infra";
    const regionPrefix = isInfra ? shortName : `${shortName}-${regionName}`;
    const regionDomain = `${regionPrefix}${selectedEnv.domain}`;

    const borkToken =
      token ||
      (
        await fs.readFile(
          `/var/run/secrets/platform9/${environment}-bork-token`,
          "utf8"
        )
      ).trim();

    const upgradePayload = {
      options: {
        chart_url: charturl,
      },
      ...(use_du_specific_le_http_cert && {
        use_du_specific_le_http_cert: true,
      }),
    };

    // Perform UPGRADE request
    log.info(`Upgrading region: ${regionDomain}`);
    const upgradeResponse = await new Promise<{
      statusCode: number;
      body: string;
    }>((resolve, reject) => {
      const upgradeReq = https.request(
        {
          hostname: new URL(selectedEnv.borkUrl).hostname,
          path: `/api/v1/regions/${regionDomain}`,
          method: "UPGRADE",
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

      upgradeReq.on("error", (err) => {
        log.error(`HTTPS error during upgrade: ${err.message}`);
        reject(err);
      });

      upgradeReq.write(JSON.stringify(upgradePayload));
      upgradeReq.end();
    });

    if (upgradeResponse.statusCode >= 400) {
      log.error(
        `Upgrade failed (${upgradeResponse.statusCode}): ${upgradeResponse.body}`
      );
      return NextResponse.json(
        {
          error: `Upgrade failed (${upgradeResponse.statusCode}): ${upgradeResponse.body}`,
        },
        { status: upgradeResponse.statusCode }
      );
    }

    return NextResponse.json({
      message: `Region ${regionDomain} upgraded successfully`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error(`Upgrade operation failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
