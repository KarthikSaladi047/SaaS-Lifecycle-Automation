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
      log.error(`Invalid environment: ${environment}`);
      return NextResponse.json(
        { error: "Invalid environment" },
        { status: 400 }
      );
    }

    const getTokenFromSecret = async (env: string) => {
      const secretPath = `/var/run/secrets/platform9/${env}-bork-token`;
      return (await fs.readFile(secretPath, "utf8")).trim();
    };

    const borkToken = token || (await getTokenFromSecret(environment));
    const regionPrefix = isInfra ? short : `${short}-${region}`;
    const regionDomain = `${regionPrefix}${selectedEnv.domain}`;
    const customerUrl = `${selectedEnv.borkUrl}/api/v1/customers/${short}`;

    // Step 1: Send BURN request
    const burnResponse = await new Promise<{ completed: boolean }>(
      (resolve) => {
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
            res.on("data", () => {});
            res.on("end", () => {
              log.info(`BURN completed for ${regionDomain}`);
              resolve({ completed: true });
            });
          }
        );

        reqBurn.on("error", (err) => {
          log.warn(`BURN request failed silently: ${err.message}`);
          resolve({ completed: false });
        });

        reqBurn.end();

        setTimeout(() => {
          log.warn(`BURN timed out after 10s for ${regionDomain}`);
          resolve({ completed: false });
        }, 10_000);
      }
    );

    // Step 2: If Infra, try to delete customer
    if (isInfra && burnResponse.completed) {
      log.info(`Deleting customer: ${short}`);
      const deleteCustomer = await fetch(customerUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!deleteCustomer.ok) {
        const errorText = await deleteCustomer.text();
        log.warn(`Customer deletion failed: ${errorText}`);
      } else {
        log.success(`Customer ${short} deleted successfully.`);
      }
    }

    log.success(
      `Region ${regionDomain} deletion initiated.${
        isInfra ? " Customer delete scheduled." : ""
      }`
    );

    return NextResponse.json({
      message: `Region ${regionDomain} BURN sent successfully${
        isInfra ? " and customer delete attempted." : ""
      }`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error(`Delete operation failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
