"use client";
import React from "react";
import { Step } from "@/app/types/pcd";
import { colorClasses, environmentOptions } from "@/app/constants/pcd";

interface StepSelectProps {
  formData: {
    environment: string;
  };
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  setStep: (step: Step) => void;
}

export default function StepSelect({
  formData,
  handleInputChange,
  setStep,
}: StepSelectProps) {
  return (
    <>
      {" "}
      <div className="mx-3">
        <h2 className="text-3xl font-bold mt-4 text-center text-yellow-800">
          Manage PCD
        </h2>

        <h4 className="text-xl font-semibold mb-2 mt-6 text-left text-gray-800">
          Select Environment:
        </h4>
        <select
          name="environment"
          value={formData.environment}
          onChange={handleInputChange}
          required
          className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
        >
          <option value="">Select an Environment</option>
          {environmentOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <h2 className="text-2xl font-semibold mb-6 mt-8 text-left text-gray-800">
          Choose an action:
        </h2>

        <div className="space-y-3">
          {[
            {
              label: "Create Infra Region",
              step: "create" as Step,
              color: "blue",
            },
            {
              label: "Add Workload Region",
              step: "addRegion" as Step,
              color: "green",
            },
            {
              label: "Delete a Region",
              step: "deleteRegion" as Step,
              color: "red",
            },
            {
              label: "Update Lease",
              step: "updateLease" as Step,
              color: "purple",
              envRestricted: true,
            },
            {
              label: "Upgrade a Region",
              step: "upgrade" as Step,
              color: "yellow",
            },
          ].map(({ label, step: targetStep, color, envRestricted }) => {
            const selectedEnv = environmentOptions.find(
              (opt) => opt.value === formData.environment
            );

            const disabled =
              (envRestricted && selectedEnv?.isProd) || !formData.environment;
            return (
              <button
                key={label}
                onClick={() => setStep(targetStep)}
                disabled={disabled}
                className={`w-full px-4 py-3 rounded-xl transition font-medium text-white ${
                  disabled
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : `${colorClasses[color]} cursor-pointer`
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
