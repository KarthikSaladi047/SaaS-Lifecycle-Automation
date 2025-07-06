"use client";
import React, { useEffect, useState } from "react";
import {
  GroupedData,
  HostStatus,
  PrometheusResultEntry,
} from "../../types/pcd";
import { environmentOptions } from "@/app/constants/pcd";
import { getFilenameWithoutExtension } from "./utils";
import HostStatusModal from "./HostStatusModal";
import PodStatusModal from "./PodStatusModal";
import ResetConfirmation from "./ResetConfirmation";
import TagManager from "./TagManager";
import SearchBar from "./SearchBar";
import ExportButton from "./ExportButton";

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
  const [loadingPods, setLoadingPods] = useState(true);
  const [allPods, setAllPods] = useState<PrometheusResultEntry[]>([]);
  const [podPopup, setPodPopup] = useState<{
    namespace: string;
    result: PrometheusResultEntry[];
  } | null>(null);
  const [loadingHosts, setLoadingHosts] = useState(true);
  const [hostDataMap, setHostDataMap] = useState<Record<string, HostStatus[]>>(
    {}
  );
  const [hostPopup, setHostPopup] = useState<{
    fqdn: string;
    result: HostStatus[];
  } | null>(null);

  const currentEnvType = environmentOptions.find(
    (env) => env.value === environment
  )?.type;

  const isNonProd = currentEnvType !== "prod";

  // Reset Task status
  const resetTaskStatus = () => {
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
    setLoadingHosts(true);
    const fetchAllHosts = async () => {
      try {
        const res = await fetch(
          `/api/cortex/query?query=resmgr_host_up&env=${environment}`
        );
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
      } finally {
        setLoadingHosts(false);
      }
    };

    fetchAllHosts();
  }, [environment, data]);

  // Pod Status
  useEffect(() => {
    const fetchPods = async () => {
      setLoadingPods(true);
      try {
        const query = `kube_pod_status_phase{cluster=~".*dataplane.*"} == 1`;

        const res = await fetch(
          `/api/cortex/query?query=${encodeURIComponent(
            query
          )}&env=${environment}`
        );
        const json = await res.json();
        const entries: PrometheusResultEntry[] = json?.data?.result || [];

        const seen = new Set<string>();
        const currentPods = entries.filter((entry) => {
          // Deduplicate based on pod name
          const podName = entry.metric.pod;
          if (seen.has(podName)) return false;
          seen.add(podName);
          return true;
        });

        setAllPods(currentPods);
      } catch (err) {
        console.error("Error fetching pods", err);
      } finally {
        setLoadingPods(false);
      }
    };

    fetchPods();
  }, [environment]);

  const getPodsForNamespace = (
    allPods: PrometheusResultEntry[],
    namespace: string
  ): PrometheusResultEntry[] => {
    return allPods.filter((entry) => entry.metric.namespace === namespace);
  };

  const countRunningPods = (pods: PrometheusResultEntry[]): number => {
    return pods.filter(
      (entry) =>
        entry.metric.phase === "Running" || entry.metric.phase === "Succeeded"
    ).length;
  };

  // Escap removes the modal
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHostPopup(null);
        setPodPopup(null);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  return (
    <>
      <div className="flex justify-between items-center px-6 mb-2">
        <SearchBar
          searchQuery={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery("")}
        />
        <ExportButton
          filteredData={filteredData}
          customerEmails={customerEmails}
          env={environment}
        />
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
                  Hosts
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left">
                  Pods
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
                      ) : loadingHosts ? (
                        <span className="text-gray-400">...</span>
                      ) : hostDataMap[region.fqdn] ? (
                        hostDataMap[region.fqdn].length === 0 ? (
                          "0 / 0"
                        ) : (
                          <button
                            onClick={() => handleHostClick(region.fqdn)}
                            className="text-blue-700 hover:text-blue-900 cursor-pointer"
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
                    <td className="px-4 py-3 border border-gray-200">
                      {loadingPods ? (
                        <span className="text-gray-400">...</span>
                      ) : (
                        (() => {
                          const pods = getPodsForNamespace(
                            allPods,
                            region.namespace
                          );
                          const running = countRunningPods(pods);

                          if (pods.length === 0) return "0 / 0";

                          return (
                            <button
                              onClick={() =>
                                setPodPopup({
                                  namespace: region.namespace,
                                  result: pods,
                                })
                              }
                              className="text-blue-700 hover:text-blue-900 cursor-pointer"
                            >
                              {running} / {pods.length}
                            </button>
                          );
                        })()
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
                      <TagManager
                        tags={
                          Array.isArray(region.tags)
                            ? region.tags
                            : (region.tags || "")
                                .split(",")
                                .map((t) => t.trim())
                                .filter(Boolean)
                        }
                        fqdn={region.fqdn}
                        tagInputValue={tagInputs[region.namespace] || ""}
                        setTagInputValue={(val) =>
                          setTagInputs((prev) => ({
                            ...prev,
                            [region.namespace]: val,
                          }))
                        }
                        environment={environment}
                        setToastMessage={setToastMessage}
                        setLocalData={setLocalData}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Reset Confirmation Modal */}
      {confirmFQND && (
        <ResetConfirmation
          onCancel={() => setConfirmFQDN(null)}
          onConfirm={resetTaskStatus}
          fqdn={confirmFQND}
        />
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
        <HostStatusModal
          fqdn={hostPopup.fqdn}
          result={hostPopup.result}
          onClose={() => setHostPopup(null)}
        />
      )}

      {/* Pod Status */}
      {podPopup && (
        <>
          <PodStatusModal
            namespace={podPopup.namespace}
            result={podPopup.result}
            onClose={() => setPodPopup(null)}
          />
        </>
      )}
    </>
  );
};

export default Table;
