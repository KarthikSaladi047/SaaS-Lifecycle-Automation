"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  GroupedData,
  HostStatus,
  PrometheusResultEntry,
} from "../../types/pcd";
import { environmentOptions, tagColors } from "@/app/constants/pcd";

type TableProps = {
  data: GroupedData[];
  customerEmails: Record<string, string>;
  environment: string;
};

const Table: React.FC<TableProps> = ({ data, customerEmails, environment }) => {
  const [confirmFQND, setConfirmFQDN] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  const [localData, setLocalData] = useState(data);
  const [hostPopup, setHostPopup] = useState<{
    fqdn: string;
    result: HostStatus[];
  } | null>(null);
  const [hostDataMap, setHostDataMap] = useState<Record<string, HostStatus[]>>(
    {}
  );

  const currentEnvType = environmentOptions.find(
    (env) => env.value === environment
  )?.type;

  const isNonProd = currentEnvType !== "prod";

  const getTagColor = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return tagColors[Math.abs(hash) % tagColors.length];
  };

  // Tags
  const updateRegionTags = useCallback((fqdn: string, tags: string[]) => {
    setLocalData((prev) =>
      prev.map((group) => ({
        ...group,
        regions: group.regions.map((region) =>
          region.fqdn === fqdn
            ? {
                ...region,
                tags: tags.join(","),
              }
            : region
        ),
      }))
    );
  }, []);

  const handleTagChange = async (
    fqdn: string,
    tag: string,
    endpoint: string,
    successMessage: string,
    errorMessage: string
  ) => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment, fqdn, tag }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      updateRegionTags(fqdn, data.tags || []);
      setToastMessage(successMessage);
    } catch {
      setToastMessage(errorMessage);
    }
  };

  const handleAddTag = (fqdn: string, newTag: string) => {
    const cleanTag = newTag.trim();
    if (cleanTag) {
      handleTagChange(
        fqdn,
        cleanTag,
        "/api/addTag",
        "Tag added successfully",
        "Failed to add tag"
      );
    }
  };

  const handleRemoveTag = (fqdn: string, tag: string) => {
    const cleanTag = tag.trim();
    if (cleanTag) {
      handleTagChange(
        fqdn,
        cleanTag,
        "/api/removeTag",
        "Tag removed",
        "Failed to remove tag"
      );
    }
  };

  // Reset Task status
  const handleConfirm = () => {
    if (!confirmFQND) return;
    fetch(
      `/api/resetTaskStatus?env=${environment}&fqdn=${encodeURIComponent(
        confirmFQND
      )}`
    )
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(() => {
        setToastMessage("Task status is reset");
        window.location.reload();
      })
      .catch(() => setToastMessage("Failed to reset task status"))
      .finally(() => setConfirmFQDN(null));
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
          region.use_du_specific_le_http_cert,
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
      download: `pcd-table-export-${Date.now()}.csv`,
      style: "visibility:hidden",
    });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart extension Remover
  const getFilenameWithoutExtension = (url: string): string => {
    const filename = url?.split("/").pop() || "";
    return filename.includes(".") ? filename.split(".")[0] : filename;
  };

  // search
  useEffect(() => {
    const currentEnv = localStorage.getItem("selectedEnv");
    const lastEnv = localStorage.getItem("lastEnvUsedForSearch");

    if (currentEnv && currentEnv !== lastEnv) {
      localStorage.removeItem("searchParameter");
      setSearchQuery("");
    } else {
      const saved = localStorage.getItem("searchParameter");
      if (saved) setSearchQuery(saved);
    }
    if (currentEnv) localStorage.setItem("lastEnvUsedForSearch", currentEnv);
  }, []);

  useEffect(() => {
    localStorage.setItem("searchParameter", searchQuery);
  }, [searchQuery]);

  const filteredData = localData
    .map((group) => ({
      ...group,
      regions: group.regions.filter((region) => {
        const content = [
          group.customer,
          region.region_name,
          region.namespace,
          region.task_state,
          region.deployed_at,
          region.chart_url,
          region.owner,
          region.use_du_specific_le_http_cert,
          region.lease_date,
          customerEmails[group.customer] || "",
          region.tags || "",
        ]
          .join(" ")
          .toLowerCase();
        return content.includes(searchQuery.toLowerCase());
      }),
    }))
    .filter((group) => group.regions.length);

  // Host Details
  const handleHostClick = (fqdn: string) => {
    setHostPopup({ fqdn, result: hostDataMap[fqdn] || [] });
  };

  useEffect(() => {
    const fetchAllHosts = async () => {
      try {
        const res = await fetch("/api/cortex/query?query=resmgr_host_up");
        const json = await res.json();
        const result = json?.data?.result || [];

        const grouped: Record<string, HostStatus[]> = {};

        result.forEach((entry: PrometheusResultEntry) => {
          const fqdn = entry.metric.du;
          if (!fqdn) return;

          if (!grouped[fqdn]) grouped[fqdn] = [];

          grouped[fqdn].push({
            host_id: entry.metric.host_id || "N/A",
            host_name: entry.metric.host_name || "N/A",
            value: entry.value[1],
          });
        });

        data
          .flatMap((group) => group.regions)
          .forEach((region) => {
            const fqdn = region.fqdn;
            if (region.region_name !== "Infra" && !grouped[fqdn]) {
              grouped[fqdn] = [];
            }
          });

        setHostDataMap(grouped);
      } catch (err) {
        console.error("Failed to fetch host data", err);
      }
    };

    fetchAllHosts();
  }, [data]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) =>
      e.key === "Escape" && setHostPopup(null);
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

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
                  Host Status
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
                    <td className="px-4 py-3 border border-gray-200">
                      {region.region_name === "Infra" ? (
                        "N/A"
                      ) : hostDataMap[region.fqdn] ? (
                        hostDataMap[region.fqdn].length === 0 ? (
                          "0 / 0"
                        ) : (
                          <button
                            onClick={() => handleHostClick(region.fqdn)}
                            className="text-blue-700 underline hover:text-blue-900 cursor-pointer"
                          >
                            {
                              hostDataMap[region.fqdn].filter(
                                (h) => h.value === "1"
                              ).length
                            }{" "}
                            / {hostDataMap[region.fqdn].length}
                          </button>
                        )
                      ) : (
                        "0 / 0"
                      )}
                    </td>

                    <td className="px-4 py-3 border border-gray-200 capitalize">
                      <div className="flex items-center justify-between gap-2 relative group">
                        <span>{region.task_state}</span>
                        {region.task_state.toLowerCase() !== "ready" && (
                          <>
                            <button
                              onClick={() => setConfirmFQDN(region.fqdn)}
                              disabled={!region.task_state}
                              className={`text-blue-600 hover:text-blue-800 ${
                                !region.task_state
                                  ? "opacity-50 cursor-not-allowed"
                                  : "cursor-pointer"
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
      {/* Host Status */}
      {hostPopup && (
        <div className="fixed inset-0 z-50 bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-300 rounded-2xl p-6 w-[90%] max-w-3xl shadow-2xl relative border border-gray-300">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Host Status for{" "}
              <span className="text-blue-600">{hostPopup.fqdn}</span>
            </h2>

            {hostPopup.result.length === 0 ? (
              <p className="text-gray-500 text-center">No host data found.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm bg-white">
                  <thead className="bg-gray-100 text-gray-700 font-semibold">
                    <tr>
                      <th className="px-4 py-2 text-left border-b">Host ID</th>
                      <th className="px-4 py-2 text-left border-b">
                        Host Name
                      </th>
                      <th className="px-4 py-2 text-left border-b">
                        Responding
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {hostPopup.result.map((host, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-2 border-b font-mono text-gray-700">
                          {host.host_id}
                        </td>
                        <td className="px-4 py-2 border-b text-gray-800">
                          {host.host_name}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {host.value === "1" ? (
                            <span className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-block bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                              No
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={() => setHostPopup(null)}
              className="absolute top-3 right-4 text-gray-500 hover:text-red-500 text-xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Table;
