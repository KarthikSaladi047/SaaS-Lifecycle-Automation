import { NextRequest, NextResponse } from "next/server";
import https from "https";
import fs from "fs/promises";
import { environmentOptions, log } from "@/app/constants/pcd";

export async function DELETE(req: NextRequest) {
  try {
    const { environment, shortName, regionName, token, userEmail } =
      await req.json();

    const short = shortName.trim().toLowerCase();
    const region = regionName.trim().toLowerCase();
    const isInfra = region === "infra";

    if (userEmail) {
      log.info(`Delete requested by: ${userEmail}`);
    } else {
      log.warn("No userEmail provided in request body");
    }

    const selectedEnv = environmentOptions.find(
      (env) => env.value === environment
    );

    if (!selectedEnv?.borkUrl || !selectedEnv?.domain) {
      const msg = `Invalid environment: ${environment}`;
      log.error(msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const borkToken =
      token ||
      (
        await fs.readFile(
          `/var/run/secrets/platform9/${environment}-bork-token`,
          "utf8"
        )
      ).trim();

    const regionPrefix = isInfra ? short : `${short}-${region}`;
    const regionDomain = `${regionPrefix}${selectedEnv.domain}`;
    const customerUrl = `${selectedEnv.borkUrl}/api/v1/customers/${short}`;

    // Step 1: Send BURN request
    const burnResponse = await new Promise<{
      statusCode: number;
      body: string;
    }>((resolve) => {
      log.info(`Sending BURN request for region: ${regionDomain}`);

      const reqBurn = https.request(
        {
          hostname: new URL(selectedEnv.borkUrl).hostname,
          path: `/api/v1/regions/${regionDomain}`,
          method: "BURN",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${borkToken}`,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            resolve({ statusCode: res.statusCode || 500, body: data });
          });
        }
      );

      reqBurn.on("error", (err) => {
        log.error(`BURN request error: ${err.message}`);
        resolve({ statusCode: 500, body: err.message });
      });

      reqBurn.end();

      // Timeout after 10s
      setTimeout(() => {
        log.warn(`BURN timed out after 10s for ${regionDomain}`);
        resolve({ statusCode: 408, body: "BURN timeout" });
      }, 10_000);
    });

    if (burnResponse.statusCode >= 400) {
      const msg = `BURN failed (${burnResponse.statusCode}): ${burnResponse.body}`;
      log.error(msg);
      return NextResponse.json(
        { error: msg },
        { status: burnResponse.statusCode }
      );
    }

    log.success(`BURN request succeeded for ${regionDomain}`);

    // Step 2: If Infra, delete customer
    if (isInfra) {
      log.info(`Deleting customer: ${short}`);
      const deleteRes = await fetch(customerUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const deleteText = await deleteRes.text();

      if (!deleteRes.ok) {
        log.warn(`Customer deletion failed: ${deleteText}`);
        // Still return 200 to frontend, but log internally
      } else {
        log.success(`Customer ${short} deleted successfully`);
      }
    }

    return NextResponse.json({
      message: `Region ${regionDomain} deletion initiated.${
        isInfra ? " Customer delete attempted." : ""
      }`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error(`Delete operation failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
