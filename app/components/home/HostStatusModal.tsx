"use client";
import React from "react";
import { HostStatus } from "../../types/pcd";

type HostStatusModalProps = {
  fqdn: string;
  result: HostStatus[];
  onClose: () => void;
};

const HostStatusModal: React.FC<HostStatusModalProps> = ({
  fqdn,
  result,
  onClose,
}) => {
  const exportCSV = () => {
    const headers = ["Host ID", "Host Name", "Responding"];
    const rows = result.map((host) => [
      host.host_id,
      host.host_name,
      host.value === "1" ? "Yes" : "No",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hosts_${fqdn}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="relative w-[90%] max-w-3xl">
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-white text-gray-800 hover:text-red-500 border rounded-full w-8 h-8 flex items-center justify-center shadow-lg z-50"
          title="Close"
        >
          ×
        </button>

        <div className="bg-gray-300 rounded-2xl p-6 shadow-2xl max-h-[80vh] border border-gray-300 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              Hosts: <span className="text-blue-600">{fqdn}</span>
            </h2>
            <button
              onClick={exportCSV}
              className="text-sm px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1"
              title="Download CSV"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                />
              </svg>
            </button>
          </div>

          {result.length === 0 ? (
            <p className="text-black text-center">No host data found.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm bg-white">
                <thead className="bg-gray-100 text-gray-700 font-semibold">
                  <tr>
                    <th className="px-4 py-2 text-left border-b">Host ID</th>
                    <th className="px-4 py-2 text-left border-b">Host Name</th>
                    <th className="px-4 py-2 text-left border-b">Responding</th>
                  </tr>
                </thead>
                <tbody>
                  {result.map((host, idx) => (
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
        </div>
      </div>
    </div>
  );
};

export default HostStatusModal;
