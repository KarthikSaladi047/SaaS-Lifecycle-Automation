"use client";
import React from "react";
import { PrometheusResultEntry } from "../../types/pcd";

type PodStatusModalProps = {
  namespace: string;
  result: PrometheusResultEntry[];
  onClose: () => void;
};

const PodStatusModal: React.FC<PodStatusModalProps> = ({
  namespace,
  result,
  onClose,
}) => {
  const exportCSV = () => {
    const headers = ["Pod Name", "Phase"];
    const rows = result.map((pod) => [pod.metric.pod, pod.metric.phase]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pods_${namespace}.csv`);
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

        <div className="bg-gray-300 rounded-lg p-6 shadow-xl max-h-[50vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Pods in NS <span className="text-blue-600">{namespace}</span>
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
            <p className="text-gray-500">No pod data found.</p>
          ) : (
            <table className="w-full text-sm border bg-white border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Pod Name</th>
                  <th className="border p-2 text-left">Phase</th>
                </tr>
              </thead>
              <tbody>
                {result.map((pod, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border p-2 font-mono">{pod.metric.pod}</td>
                    <td
                      className={`border p-2 font-semibold text-gray-800 ${
                        pod.metric.phase === "Running"
                          ? "bg-green-100 text-green-700"
                          : pod.metric.phase === "Succeeded"
                          ? "bg-orange-100 text-orange-400"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {pod.metric.phase}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PodStatusModal;
