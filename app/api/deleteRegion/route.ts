import { NextRequest, NextResponse } from "next/server";
import https from "https";

export async function DELETE(req: NextRequest) {
  try {
    const { environment, shortName, regionName } = await req.json();

    const isInfra = regionName === "Infra";

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

    const regionUrl = `${baseURL}/api/v1/regions/${regionDomain}`;
    const customerUrl = `${baseURL}/api/v1/customers/${shortName}`;

    // Step 1: Fire-and-forget BURN
    try {
      const burnReq = https.request(
        {
          hostname: new URL(baseURL).hostname,
          path: `/api/v1/regions/${regionDomain}`,
          method: "BURN",
          headers: {
            "Content-Type": "application/json",
          },
        },
        (res) => {
          res.on("data", () => {});
          res.on("end", () => {
            console.log(
              `BURN finished for ${regionDomain} with status ${res.statusCode}`
            );
          });
        }
      );

      burnReq.on("error", (err) => {
        console.warn(`BURN request error (ignored):`, err.message);
      });

      burnReq.end();
    } catch (err) {
      console.warn("BURN request failed silently:", err);
    }

    // Step 2: DELETE region
    const deleteRegion = await fetch(regionUrl, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!deleteRegion.ok) {
      throw new Error(`Region deletion failed: ${await deleteRegion.text()}`);
    }

    // Step 3: DELETE customer (if Infra)
    if (isInfra) {
      const deleteCustomer = await fetch(customerUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!deleteCustomer.ok) {
        throw new Error(
          `Customer deletion failed: ${await deleteCustomer.text()}`
        );
      }
    }

    return NextResponse.json({
      message: `Deleted region ${regionDomain}${
        isInfra ? " and customer" : ""
      } successfully.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
