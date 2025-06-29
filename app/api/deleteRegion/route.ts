import { NextRequest, NextResponse } from "next/server";
import https from "https";
import fs from "fs/promises";
import { bork_urls, log } from "@/app/constants/pcd";

export async function DELETE(req: NextRequest) {
  try {
    const { environment, shortName, regionName, token, userEmail } =
      await req.json();

    // 🔍 Log user initiating the delete
    if (userEmail) {
      log.info(` Delete requested by userEmail: ${userEmail}`);
    } else {
      log.warn("No userEmail provided in request body");
    }

    const isInfra = regionName === "Infra";

    const getTokenFromSecret = async (env: string) => {
      const secretPath = `/var/run/secrets/platform9/${env}-bork-token`;
      return (await fs.readFile(secretPath, "utf8")).trim();
    };

    const borkToken = token || (await getTokenFromSecret(environment));
    const baseURL = bork_urls[environment];
    const regionPrefix = isInfra ? shortName : `${shortName}-${regionName}`;
    const regionDomain = baseURL
      .replace("https://", "")
      .replace("bork", regionPrefix);
    const customerUrl = `${baseURL}/api/v1/customers/${shortName}`;

    // Step 1: Fire-and-forget BURN
    try {
      log.info(` Sending BURN request for region: ${regionDomain}`);
      const burnReq = https.request(
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
          res.on("data", () => {});
          res.on("end", () => {
            log.info(
              `BURN finished for ${regionDomain} with status ${res.statusCode}`
            );
          });
        }
      );

      burnReq.on("error", (err) => {
        log.warn(`BURN request error (ignored): ${err.message}`);
      });

      burnReq.end();
    } catch (err: unknown) {
      if (err instanceof Error) {
        log.warn(`BURN request failed silently: ${err.message}`);
      } else {
        log.warn(`Unknown error during BURN request: ${JSON.stringify(err)}`);
      }
    }

    // Step 2: DELETE customer (if Infra)
    if (isInfra) {
      log.info(` Deleting customer: ${shortName}`);
      const deleteCustomer = await fetch(customerUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!deleteCustomer.ok) {
        const errorText = await deleteCustomer.text();
        log.warn(`Customer deletion failed: ${errorText}`);
        throw new Error(`Customer deletion failed: ${errorText}`);
      }
    }

    log.success(
      `Region ${regionDomain} deleted${isInfra ? " along with customer" : ""}.`
    );

    return NextResponse.json({
      message: `Deleted region ${regionDomain}${
        isInfra ? " and customer" : ""
      } successfully.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error(`Delete operation failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
