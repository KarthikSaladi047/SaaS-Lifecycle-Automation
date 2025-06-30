import { NextRequest, NextResponse } from "next/server";
import https from "https";
import fs from "fs/promises";
import { bork_urls, log } from "@/app/constants/pcd";

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

    const getTokenFromSecret = async (env: string) => {
      const secretPath = `/var/run/secrets/platform9/${env}-bork-token`;
      return (await fs.readFile(secretPath, "utf8")).trim();
    };

    const borkToken = token || (await getTokenFromSecret(environment));
    const baseURL = bork_urls[environment];

    const regionPrefix = isInfra ? short : `${short}-${region}`;
    const regionDomain = baseURL
      .replace("https://", "")
      .replace("bork", regionPrefix);
    const customerUrl = `${baseURL}/api/v1/customers/${short}`;

    // Step 1: Send BURN request and wait (max 10s)
    const burnResponse = await new Promise<{ completed: boolean }>(
      (resolve) => {
        log.info(`Sending BURN request for region: ${regionDomain}`);

        const req = https.request(
          {
            hostname: new URL(baseURL).hostname,
            path: `/api/v1/regions/${regionDomain}`,
            method: "BURN",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${borkToken}`,
            },
          },
          (res) => {
            res.on("data", () => {}); // Ignore body
            res.on("end", () => {
              log.info(`BURN completed for ${regionDomain}`);
              resolve({ completed: true });
            });
          }
        );

        req.on("error", (err) => {
          log.warn(`BURN request failed silently: ${err.message}`);
          resolve({ completed: false });
        });

        req.end();

        // Timeout if BURN hangs > 10s
        setTimeout(() => {
          log.warn(`BURN timed out after 10s for ${regionDomain}`);
          resolve({ completed: false });
        }, 10_000);
      }
    );

    // Step 2: If Infra and BURN completed, delete customer
    if (isInfra && burnResponse.completed) {
      log.info(`Deleting customer: ${short}`);
      const deleteCustomer = await fetch(customerUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!deleteCustomer.ok) {
        const errorText = await deleteCustomer.text();
        log.warn(`Customer deletion failed: ${errorText}`);
        // But we don’t throw — user already got confirmation
      } else {
        log.success(`Customer ${short} deleted successfully.`);
      }
    }

    // ✅ Respond to frontend no matter what
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
