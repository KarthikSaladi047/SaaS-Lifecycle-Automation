"use client";

import React from "react";
import PasswordInput from "./PasswordInput";
import { FormData, Step } from "@/app/types/pcd";
import { Tag_suggestions } from "@/app/constants/pcd";

interface Chart {
  version: string;
  location: string;
}

interface DynamicFormProps {
  step: Step;
  formData: FormData;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  charts: Chart[];
  infraNamespaces: string[];
  regionNames: string[];
  dbBackendOptions: { value: string; label: string }[];
  setStep: (step: Step | "select") => void;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  showTokenInput: boolean;
  setShowTokenInput: (val: boolean) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (val: boolean) => void;
  deleteConfirmInput: string;
  setDeleteConfirmInput: (val: string) => void;
  submissionSuccess: string | null;
  setSubmissionSuccess: (val: string | null) => void;
  resetForm: () => void;
  getFilenameWithoutExtension: (url: string) => string;
}

const DynamicForm: React.FC<DynamicFormProps> = ({
  step,
  formData,
  handleInputChange,
  charts,
  infraNamespaces,
  regionNames,
  dbBackendOptions,
  setStep,
  setFormData,
  handleSubmit,
  showTokenInput,
  setShowTokenInput,
  showDeleteConfirm,
  setShowDeleteConfirm,
  deleteConfirmInput,
  setDeleteConfirmInput,
  setSubmissionSuccess,
  resetForm,
  getFilenameWithoutExtension,
}) => {
  return (
    <form onSubmit={handleSubmit} className="space-y-5 mt-6">
      <h2 className="text-2xl font-bold capitalize text-center text-gray-800">
        {step === "create"
          ? "Create New PCD"
          : step === "addRegion"
          ? "Add Region"
          : step === "deleteRegion"
          ? "Delete Region"
          : "Update Lease"}
      </h2>

      {/* ENV Display */}
      <h3 className="text-xl font-semibold mb-6 mt-8 text-left text-gray-800">
        Selected Environment:{" "}
        {formData.environment.charAt(0).toUpperCase() +
          formData.environment.slice(1)}
      </h3>

      {/* Short Name Input */}
      {step === "create" ? (
        <input
          type="text"
          name="shortName"
          placeholder="Short Name"
          value={formData.shortName}
          onChange={handleInputChange}
          required
          className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      ) : (
        <select
          name="shortName"
          value={formData.shortName}
          onChange={handleInputChange}
          required
          className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">-- Select Short Name --</option>
          {infraNamespaces.map((ns) => (
            <option key={ns} value={ns}>
              {ns}
            </option>
          ))}
        </select>
      )}

      {/* Admin Email */}
      {["create", "addRegion"].includes(step) && (
        <input
          type="email"
          name="adminEmail"
          placeholder="Admin Email"
          value={formData.adminEmail}
          onChange={handleInputChange}
          readOnly={step !== "create"}
          required
          className={`w-full border px-4 py-3 rounded-xl ${
            step !== "create"
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "focus:outline-none focus:ring-2 focus:ring-blue-400"
          }`}
        />
      )}

      {/* Password Input */}
      {["create", "addRegion"].includes(step) && (
        <PasswordInput
          value={formData.adminPassword}
          onChange={handleInputChange}
        />
      )}
      {/* Region Name */}
      {step === "addRegion" ? (
        <input
          type="text"
          name="regionName"
          placeholder="Region Name"
          value={formData.regionName}
          onChange={handleInputChange}
          required
          className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      ) : ["deleteRegion", "updateLease"].includes(step) ? (
        <>
          <select
            name="regionName"
            value={formData.regionName}
            onChange={handleInputChange}
            required
            disabled={formData.shortName === ""}
            className={`w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              formData.shortName === "" ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
          >
            <option value="">-- Select Region --</option>
            {regionNames.map((region) => {
              const isInfra = region.toLowerCase() === "infra";
              const hasWorkloadRegions = regionNames.some(
                (r) => r.toLowerCase() !== "infra"
              );

              return (
                <option
                  key={region}
                  value={region}
                  disabled={isInfra && hasWorkloadRegions}
                  title={
                    isInfra && hasWorkloadRegions
                      ? "Infra Region cannot be deleted when workload regions are running"
                      : ""
                  }
                >
                  {region}
                  {isInfra && hasWorkloadRegions ? " (Unavailable)" : ""}
                </option>
              );
            })}
          </select>
        </>
      ) : null}

      {/* DB Backend */}
      {["create", "addRegion"].includes(step) && (
        <select
          name="dbBackend"
          value={formData.dbBackend}
          onChange={handleInputChange}
          required
          disabled={step === "addRegion"}
          className={`w-full border px-4 py-3 rounded-xl cursor-pointer ${
            step === "addRegion"
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "focus:outline-none focus:ring-2 focus:ring-blue-400"
          }`}
        >
          {dbBackendOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}

      {/* Chart URL */}
      {["create", "addRegion"].includes(step) && (
        <select
          name="charturl"
          value={formData.charturl}
          onChange={handleInputChange}
          required={step === "create"}
          disabled={step === "addRegion"}
          className={`w-full border px-4 py-3 rounded-xl cursor-pointer ${
            step === "addRegion"
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "focus:outline-none focus:ring-2 focus:ring-blue-400"
          }`}
        >
          <option value="">Choose PCD Version</option>
          {step === "create" &&
            charts.map(({ version, location }) => (
              <option key={location} value={location}>
                {version}
              </option>
            ))}
          {step === "addRegion" && (
            <option
              key={getFilenameWithoutExtension(formData.charturl)}
              value={formData.charturl}
            >
              {getFilenameWithoutExtension(formData.charturl)}
            </option>
          )}
        </select>
      )}

      {/* Lease Date */}
      {["create", "addRegion", "updateLease"].includes(step) &&
        formData.environment !== "production" && (
          <div className="w-full">
            <label className="block text-gray-600 mb-1" htmlFor="leaseUntil">
              {step === "updateLease" ? "Set New Lease Date" : "Lease Date"}
            </label>

            {/* Duration Dropdown */}
            <select
              id="leaseSelector"
              onChange={(e) => {
                const val = e.target.value;
                const now = new Date();
                const leaseDate = new Date(now);

                if (val.endsWith("w")) {
                  leaseDate.setDate(now.getDate() + parseInt(val) * 7);
                } else if (val.endsWith("m")) {
                  leaseDate.setMonth(now.getMonth() + parseInt(val));
                }

                handleInputChange({
                  target: {
                    name: "leaseDate",
                    value: leaseDate.toISOString().split("T")[0],
                  },
                } as unknown as React.ChangeEvent<HTMLInputElement>);
              }}
              className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer mb-2"
            >
              <option value="">Select Duration</option>

              {/* Weeks only for dev/qa */}
              {(formData.environment === "dev" ||
                formData.environment === "qa") &&
                [1, 2, 3, 4].map((w) => (
                  <option key={w} value={`${w}w`}>
                    {w} week{w > 1 ? "s" : ""}
                  </option>
                ))}

              {/* Weeks + Months for staging */}
              {formData.environment === "staging" && (
                <>
                  {[1, 2, 3].map((w) => (
                    <option key={`w${w}`} value={`${w}w`}>
                      {w} week{w > 1 ? "s" : ""}
                    </option>
                  ))}
                  {[1, 2, 3].map((m) => (
                    <option key={`m${m}`} value={`${m}m`}>
                      {m} month{m > 1 ? "s" : ""}
                    </option>
                  ))}
                </>
              )}
            </select>

            {/* Readonly Date Display */}
            <input
              type="date"
              name="leaseDate"
              id="leaseDate"
              value={formData.leaseDate}
              onChange={handleInputChange}
              disabled
              min={
                new Date(Date.now() + 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0]
              }
              required
              className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
            />
          </div>
        )}
      {/* Tag input field */}
      {["create", "addRegion"].includes(step) && (
        <div>
          <label
            htmlFor="tags"
            className="block text-gray-700 mb-1 font-medium"
          >
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags
              .split(",")
              .filter(Boolean)
              .map((tag) => (
                <span
                  key={tag}
                  className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm flex items-center"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() =>
                      handleInputChange({
                        target: {
                          name: "tags",
                          value: formData.tags
                            .split(",")
                            .filter((t) => t.trim() !== tag)
                            .join(","),
                        },
                      } as unknown as React.ChangeEvent<HTMLInputElement>)
                    }
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    &times;
                  </button>
                </span>
              ))}
          </div>

          <input
            type="text"
            placeholder="Type and press Enter"
            onKeyDown={(e) => {
              const input = (e.target as HTMLInputElement).value.trim();
              if (e.key === "Enter" && input !== "") {
                e.preventDefault();
                const currentTags = formData.tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);

                if (!currentTags.includes(input)) {
                  handleInputChange({
                    target: {
                      name: "tags",
                      value: [...currentTags, input].join(","),
                    },
                  } as unknown as React.ChangeEvent<HTMLInputElement>);
                }
                (e.target as HTMLInputElement).value = "";
              }
            }}
            className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <div className="flex flex-wrap gap-2 mt-2">
            {Tag_suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  const currentTags = formData.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);
                  if (!currentTags.includes(suggestion)) {
                    handleInputChange({
                      target: {
                        name: "tags",
                        value: [...currentTags, suggestion].join(","),
                      },
                    } as unknown as React.ChangeEvent<HTMLInputElement>);
                  }
                }}
                className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm hover:bg-gray-300"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      {step === "updateLease" && (
        <input
          type="text"
          name="note"
          placeholder="Enter Reason for Extending the Lease!"
          value={formData.note}
          onChange={handleInputChange}
          required
          className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      )}

      {/* HTTP Certs */}
      {["create", "addRegion"].includes(step) && (
        <div className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            id="use_du_specific_le_http_cert"
            name="use_du_specific_le_http_cert"
            checked={formData.use_du_specific_le_http_cert === "true"}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                use_du_specific_le_http_cert: e.target.checked
                  ? "true"
                  : "false",
              }))
            }
            disabled={step === "addRegion"}
            className={`w-5 h-5 accent-blue-600 ${
              step === "addRegion" ? "cursor-not-allowed" : ""
            }`}
          />
          <label
            htmlFor="use_du_specific_le_http_cert"
            className="text-gray-700"
          >
            Use special HTTP Certs?
          </label>
        </div>
      )}
      {/* Token &*/}
      {showTokenInput && (
        <div className="fixed inset-0 flex items-center justify-center bg-cyan-100 bg-opacity-50 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
            <h3 className="text-xl font-semibold mb-4">
              Enter Production Bork Token
            </h3>
            <input
              type="text"
              name="token"
              value={formData.token}
              onChange={handleInputChange}
              className="w-full border px-4 py-2 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter Bork Token"
            />
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowTokenInput(false);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation */}
      {showDeleteConfirm && step === "deleteRegion" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Are you sure to delete?
            </h3>
            <p className="mb-4 text-gray-600">
              Please type{" "}
              <span className="font-mono bg-gray-100 px-1 rounded">
                Delete Me
              </span>{" "}
              to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              className="w-full border px-4 py-2 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Type 'Delete Me' here"
            />
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmInput("");
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Submit Button */}
      {!(showDeleteConfirm && step === "deleteRegion") && (
        <button
          type="submit"
          className="w-full bg-blue-700 text-white px-4 py-3 rounded-xl hover:bg-red-700 transition cursor-pointer"
        >
          Submit
        </button>
      )}
      <span
        onClick={() => {
          setStep("select");
          setSubmissionSuccess(null);
          resetForm();
        }}
        className="mt-2 block cursor-pointer text-blue-600 hover:text-red-600"
      >
        ← Back
      </span>
    </form>
  );
};

export default DynamicForm;
