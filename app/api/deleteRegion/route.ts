import { NextRequest, NextResponse } from "next/server";
import https from "https";
import fs from "fs/promises";
import { bork_urls } from "@/app/constants/pcd";

export async function DELETE(req: NextRequest) {
  try {
    const { environment, shortName, regionName, token, userEmail } =
      await req.json();

    // 🔍 Log user initiating the delete
    if (userEmail) {
      console.log(`[INFO] Delete requested by userEmail: ${userEmail}`);
    } else {
      console.warn("[WARN] No userEmail provided in request body");
    }

    const isInfra = regionName === "Infra";

    const getTokenFromSecret = async (env: string) => {
      const secretPath = `/var/run/secrets/platform9/${env}-bork-token`;
      return (await fs.readFile(secretPath, "utf8")).trim();
    };

    const borkToken = token || (await getTokenFromSecret(environment));
    const baseURL = bork_urls[environment];
    const regionPrefix = isInfra ? shortName : `${shortName}-${regionName}`;
    const regionDomain = baseURL.replace("bork", regionPrefix);
    const customerUrl = `${baseURL}/api/v1/customers/${shortName}`;

    // Step 1: Fire-and-forget BURN
    try {
      console.log(`[INFO] Sending BURN request for region: ${regionDomain}`);
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
            console.log(
              `[INFO] BURN finished for ${regionDomain} with status ${res.statusCode}`
            );
          });
        }
      );

      burnReq.on("error", (err) => {
        console.warn(`[WARN] BURN request error (ignored): ${err.message}`);
      });

      burnReq.end();
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.warn("[WARN] BURN request failed silently:", err.message);
      } else {
        console.warn("[WARN] Unknown error during BURN request:", err);
      }
    }

    // Step 2: DELETE customer (if Infra)
    if (isInfra) {
      console.log(`[INFO] Deleting customer: ${shortName}`);
      const deleteCustomer = await fetch(customerUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!deleteCustomer.ok) {
        const errorText = await deleteCustomer.text();
        console.error(`[ERROR] Customer deletion failed: ${errorText}`);
        throw new Error(`Customer deletion failed: ${errorText}`);
      }
    }

    console.log(
      `[SUCCESS] Region ${regionDomain} deleted${
        isInfra ? " along with customer" : ""
      }.`
    );

    return NextResponse.json({
      message: `Deleted region ${regionDomain}${
        isInfra ? " and customer" : ""
      } successfully.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[FATAL] Delete operation failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
