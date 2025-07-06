"use client";
import React from "react";
import { getFilenameWithoutExtension } from "./utils";
import { GroupedData } from "@/app/types/pcd";

type ExportButtonProps = {
  filteredData: GroupedData[];
  customerEmails: Record<string, string>;
  env: string;
};

const ExportButton: React.FC<ExportButtonProps> = ({
  filteredData,
  customerEmails,
  env,
}) => {
  const handleExport = () => {
    const csvRows = [
      [
        "Customer",
        "Customer Email",
        "Region",
        "Namespace",
        "FQDN",
        "PCD Version",
        "Dataplane",
        "Task State",
        "LE Certs?",
        "Deployed At",
        "Owner",
        "Lease date",
        "Renewals",
        "Tags",
      ],
    ];

    filteredData.forEach((customerGroup) => {
      customerGroup.regions.forEach((region) => {
        csvRows.push([
          customerGroup.customer,
          customerEmails[customerGroup.customer] || "N/A",
          region.region_name,
          region.namespace,
          region.fqdn,
          getFilenameWithoutExtension(region.chart_url),
          region.cluster.replace(/^.*?-/, "").replace(/\.app\..*$/, ""),
          region.task_state,
          region.use_du_specific_le_http_cert ? "Yes" : "No",
          new Date(region.deployed_at).toLocaleString(),
          region.owner,
          region.lease_date,
          region.lease_counter,
          region.tags,
        ]);
      });
    });

    const blob = new Blob(
      [
        csvRows
          .map((row) => row.map((cell) => `"${cell}"`).join(","))
          .join("\n"),
      ],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: `pcd-table-${env}-${Date.now()}.csv`,
      style: "visibility:hidden",
    });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-green-500 hover:bg-blue-600 text-white rounded-xl text-l"
    >
      Export CSV
    </button>
  );
};

export default ExportButton;
