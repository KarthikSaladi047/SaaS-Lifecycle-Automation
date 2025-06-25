"use client";
import React, { useState } from "react";

type Region = {
  region_name: string;
  fqdn: string;
  namespace: string;
  task_state: string;
  deployed_at: string;
};

type GroupedCustomer = {
  customer: string;
  regions: Region[];
};

type TableProps = {
  data: GroupedCustomer[];
  customerEmails: Record<string, string>;
  env: string;
};

const Table: React.FC<TableProps> = ({ data, customerEmails, env }) => {
  const [confirmNamespace, setConfirmNamespace] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!confirmNamespace) return;

    fetch(
      `/api/resetTaskStatus?env=${env}&namespace=${encodeURIComponent(
        confirmNamespace
      )}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed request");
        return res.json();
      })
      .then(() => setToastMessage("Task status is reset"))
      .catch(() => setToastMessage("Failed to reset task status"))
      .finally(() => setConfirmNamespace(null));
  };

  return (
    <>
      <div className="overflow-x-auto p-6" style={{ opacity: "0.95" }}>
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
                FQDN
              </th>
              <th className="px-4 py-3 border border-gray-200 text-left">
                Namespace
              </th>
              <th className="px-4 py-3 border border-gray-200 text-left">
                Task State
              </th>
              <th className="px-4 py-3 border border-gray-200 text-left">
                Deployed At
              </th>
            </tr>
          </thead>
          <tbody className="text-sm text-black-800">
            {data.map((customerGroup, customerIdx) =>
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
                      {region.fqdn}
                    </a>
                  </td>
                  <td className="px-4 py-3 border border-gray-200">
                    {region.namespace}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 capitalize">
                    <div className="flex items-center justify-between gap-2">
                      <span>{region.task_state}</span>
                      {region.task_state.toLowerCase() !== "ready" && (
                        <button
                          onClick={() => setConfirmNamespace(region.namespace)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Reset task status"
                        >
                          ↗
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 border border-gray-200">
                    {new Date(region.deployed_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Confirmation Modal */}
      {confirmNamespace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm text-center space-y-4">
            <p>
              Do you want to reset task status of PCD Region{" "}
              <strong>{confirmNamespace}</strong>?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleConfirm}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmNamespace(null)}
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
