"use client";
import React, { useState } from "react";
import { GroupedData } from "../../types/pcd";
import { environmentOptions, tagColors } from "@/app/constants/pcd";

type TableProps = {
  data: GroupedData[];
  customerEmails: Record<string, string>;
  environment: string;
};

const Table: React.FC<TableProps> = ({ data, customerEmails, environment }) => {
  const [confirmFQND, setConfirmFQDN] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  const [localData, setLocalData] = useState<GroupedData[]>(data);
  const currentEnvType = environmentOptions.find(
    (env) => env.value === environment
  )?.type;

  const isNonProd = currentEnvType !== "prod";

  const handleConfirm = () => {
    if (!confirmFQND) return;
    fetch(
      `/api/resetTaskStatus?env=${environment}&fqdn=${encodeURIComponent(
        confirmFQND
      )}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed request");
        return res.json();
      })
      .then(() => {
        setToastMessage("Task status is reset");
        window.location.reload(); // Reload page to reflect changes
      })
      .catch(() => setToastMessage("Failed to reset task status"))
      .finally(() => setConfirmFQDN(null));
  };

  // tag color selector
  const getTagColor = (tag: string) => {
    // Hash tag string to a number between 0 and tagColors.length - 1
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % tagColors.length;
    return tagColors[index];
  };

  // Add Tags
  const handleAddTag = (fqdn: string, newTag: string) => {
    const cleanTag = newTag.trim();

    if (!cleanTag) return;

    fetch("/api/addTag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ environment, fqdn, tag: cleanTag }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to add tag");
        return res.json();
      })
      .then((data) => {
        setLocalData((prevData) =>
          prevData.map((group) => ({
            ...group,
            regions: group.regions.map((region) =>
              region.fqdn === fqdn
                ? {
                    ...region,
                    tags: data.tags || [], // from server response
                  }
                : region
            ),
          }))
        );
        setToastMessage("Tag added successfully");
      })
      .catch(() => setToastMessage("Failed to add tag"));
  };

  // Remove Tags
  const handleRemoveTag = (fqdn: string, tagToRemove: string) => {
    const cleanTag = tagToRemove.trim();

    if (!cleanTag) return;

    fetch("/api/removeTag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ environment, fqdn, tag: cleanTag }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to remove tag");
        return res.json();
      })
      .then((data) => {
        setLocalData((prevData) =>
          prevData.map((group) => ({
            ...group,
            regions: group.regions.map((region) =>
              region.fqdn === fqdn
                ? {
                    ...region,
                    tags: data.tags || [], // use tags from backend
                  }
                : region
            ),
          }))
        );
        setToastMessage("Tag removed");
      })
      .catch(() => setToastMessage("Failed to remove tag"));
  };

  // Export CSV
  const handleExport = () => {
    const csvRows = [
      [
        "Customer",
        "Customer Email",
        "Region",
        "Namespace",
        "FQDN",
        "PCD Version",
        "Task State",
        "Special HTTP Certs Enabled?",
        "Deployed At",
        "Created By",
        "Lease date",
        "Lease Counter",
        "tags",
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
          region.task_state,
          region.use_du_specific_le_http_cert,
          new Date(region.deployed_at).toLocaleString(),
          region.owner,
          region.lease_date,
          region.lease_counter,
          region.tags,
        ]);
      });
    });

    const csvContent = csvRows
      .map((e) => e.map((v) => `"${v}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pcd-table-export-${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart name trimmer
  const getFilenameWithoutExtension = (url: string): string => {
    if (!url) return "";
    const parts = url.split("/");
    const filename = parts[parts.length - 1] || "";
    const dotIndex = filename.lastIndexOf(".");
    return dotIndex === -1 ? filename : filename.substring(0, dotIndex);
  };

  // Search & Sorting
  const filteredData = localData
    .map((customerGroup) => ({
      ...customerGroup,
      regions: customerGroup.regions.filter((region) => {
        const allFields = [
          customerGroup.customer,
          region.region_name,
          region.fqdn,
          region.namespace,
          region.task_state,
          region.deployed_at,
          region.chart_url,
          region.owner,
          region.use_du_specific_le_http_cert,
          region.lease_date,
          customerEmails[customerGroup.customer] || "",
          region.tags || "",
        ]
          .join(" ")
          .toLowerCase();
        return allFields.includes(searchQuery.toLowerCase());
      }),
    }))
    .filter((group) => group.regions.length > 0);

  return (
    <>
      <div className="flex justify-between items-center px-6 mb-2">
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search Anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1 pr-8 border border-white text-white placeholder-balck bg-transparent rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white hover:text-yellow-400 text-sm"
            >
              ×
            </button>
          )}
        </div>

        <button
          onClick={handleExport}
          className="ml-4 bg-green-700 hover:bg-yellow-700 text-white px-4 py-2 rounded shadow"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto p-6 bg-opacity-95">
        <div className="rounded-lg overflow-hidden shadow-sm border border-gray-200">
          <table className="min-w-full border border-gray-200 rounded-lg shadow-sm bg-white">
            <thead className="bg-gray-50 sticky top-0 text-sm font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3 border border-gray-200 text-left">
                  Customer
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left">
                  Region
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left">
                  Namespace
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left">
                  PCD Version
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left">
                  Dataplane
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left">
                  Task State
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left">
                  Deployed At
                </th>
                {isNonProd && (
                  <th className="px-4 py-3 border border-gray-200 text-left">
                    Owner
                  </th>
                )}
                {isNonProd && (
                  <th className="px-4 py-3 border border-gray-200 text-left">
                    LE Cert?
                  </th>
                )}
                {isNonProd && (
                  <th className="px-4 py-3 border border-gray-200 text-left">
                    Lease date
                  </th>
                )}
                {isNonProd && (
                  <th className="px-4 py-3 border border-gray-200 text-left">
                    Renewals
                  </th>
                )}
                <th className="px-4 py-3 border border-gray-200 text-left">
                  Tags
                </th>
              </tr>
            </thead>
            <tbody className="text-sm text-black-800">
              {filteredData.map((customerGroup, customerIdx) =>
                customerGroup.regions.map((region, regionIdx) => (
                  <tr
                    key={`${customerIdx}-${regionIdx}`}
                    className={`hover:bg-gray-50 transition-colors ${
                      regionIdx === 0 ? "border-t-2 border-gray-600" : ""
                    }`}
                  >
                    {regionIdx === 0 && (
                      <td
                        rowSpan={customerGroup.regions.length}
                        className="px-6 py-3 font-bold text-yellow-700 text-lg bg-blue-50"
                      >
                        <div>{customerGroup.customer}</div>
                        <div className="text-sm font-normal text-gray-600">
                          <a
                            href={`mailto:${
                              customerEmails[customerGroup.customer]
                            }`}
                            className="hover:underline hover:text-blue-600"
                          >
                            {customerEmails[customerGroup.customer] || "N/A"}
                          </a>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 border border-gray-200">
                      {region.region_name}
                    </td>
                    <td className="px-4 py-3 border border-gray-200 break-all text-blue-600">
                      <a
                        href={`https://${region.fqdn}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {region.namespace}
                      </a>
                    </td>
                    <td className="px-4 py-3 border border-gray-200">
                      {getFilenameWithoutExtension(region.chart_url)}
                    </td>
                    <td className="px-4 py-3 border border-gray-200">
                      {region.cluster
                        .replace(/^.*?-/, "")
                        .replace(/\.app\..*$/, "")}
                    </td>
                    <td className="px-4 py-3 border border-gray-200 capitalize">
                      <div className="flex items-center justify-between gap-2 relative group">
                        <span>{region.task_state}</span>
                        {region.task_state.toLowerCase() !== "ready" && (
                          <>
                            <button
                              onClick={() => setConfirmFQDN(region.fqdn)}
                              disabled={!region.task_state}
                              className={`text-blue-600 hover:text-blue-800 cursor-pointer ${
                                !region.task_state
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              ↻
                            </button>
                            {region.task_state && (
                              <div className="absolute top-full mt-1 left-0 w-max bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow">
                                Click to reset task status
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 border border-gray-200">
                      {new Date(region.deployed_at).toLocaleString()}
                    </td>
                    {isNonProd && (
                      <td className="px-4 py-3 border border-gray-200">
                        {region.owner}
                      </td>
                    )}
                    {isNonProd && (
                      <td className="px-4 py-3 border border-gray-200">
                        {region.use_du_specific_le_http_cert}
                      </td>
                    )}
                    {isNonProd && (
                      <td className="px-4 py-3 border border-gray-200">
                        {region.lease_date}
                      </td>
                    )}
                    {isNonProd && (
                      <td className="px-4 py-3 border border-gray-200">
                        {region.lease_counter}
                      </td>
                    )}
                    <td className="px-4 py-3 border border-gray-200">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(region.tags)
                          ? region.tags
                          : (region.tags || "")
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean)
                        ).map((tag, idx) => (
                          <span
                            key={idx}
                            className={`${getTagColor(
                              tag
                            )} px-2 py-0.5 rounded-full text-xs flex items-center`}
                          >
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(region.fqdn, tag)}
                              className="ml-1 text-red-500 hover:text-red-700 text-xs"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={tagInputs[region.namespace] || ""}
                        onChange={(e) =>
                          setTagInputs((prev) => ({
                            ...prev,
                            [region.namespace]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const newTag = tagInputs[region.namespace]?.trim();
                            if (newTag) {
                              handleAddTag(region.fqdn, newTag);
                              setTagInputs((prev) => ({
                                ...prev,
                                [region.namespace]: "",
                              }));
                            }
                          }
                        }}
                        placeholder="Add tag & Enter"
                        className="mt-1 text-xs w-full px-2 py-1"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmFQND && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-black text-white p-6 rounded-lg shadow-lg max-w-sm text-center space-y-4">
            <p>
              Do you want to reset task status of PCD{" "}
              <strong>{confirmFQND}</strong>?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleConfirm}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmFQDN(null)}
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white px-6 py-3 rounded shadow-lg z-50 flex items-center gap-4">
          {toastMessage}
          <button
            onClick={() => setToastMessage(null)}
            className="text-yellow-400 hover:text-yellow-300 text-lg"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};

export default Table;
