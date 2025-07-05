"use client";

import React from "react";
import { useEffect, useRef } from "react";
import PasswordInput from "./PasswordInput";
import { Chart, DataPlane, FormData, Step } from "@/app/types/pcd";
import { environmentOptions, Tag_suggestions } from "@/app/constants/pcd";

interface DynamicFormProps {
  step: Step;
  formData: FormData;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  charts: Chart[];
  shortNames: string[];
  regionNames: string[];
  dbBackendOptions: { value: string; label: string }[];
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
  showCustomInput: boolean;
  setShowCustomInput: (val: boolean) => void;
  datplaneOptions: DataPlane[];
}

const DynamicForm: React.FC<DynamicFormProps> = ({
  step,
  formData,
  handleInputChange,
  charts,
  shortNames,
  regionNames,
  dbBackendOptions,
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
  setShowCustomInput,
  showCustomInput,
  datplaneOptions,
}) => {
  const tokenInputRef = useRef<HTMLInputElement | null>(null);
  const deleteInputRef = useRef<HTMLInputElement | null>(null);

  // set focus on models
  useEffect(() => {
    if (showTokenInput && tokenInputRef.current) {
      tokenInputRef.current.focus();
    }
  }, [showTokenInput]);

  useEffect(() => {
    if (showDeleteConfirm && deleteInputRef.current) {
      deleteInputRef.current.focus();
    }
  }, [showDeleteConfirm]);

  const currentEnvType = environmentOptions.find(
    (env) => env.value === formData.environment
  )?.type;
  const isNonProd = currentEnvType !== "prod";

  function getEnvType(envValue: string | undefined): string | undefined {
    return environmentOptions.find((opt) => opt.value === envValue)?.type;
  }

  const envType = getEnvType(formData.environment);
  let leaseOptions: { value: string; label: string }[] = [];

  if (envType === "dev" || envType === "qa") {
    leaseOptions = [1, 2, 3, 4].map((w) => ({
      value: `${w}w`,
      label: `${w} week${w > 1 ? "s" : ""}`,
    }));
  } else if (envType === "stage") {
    leaseOptions = [
      ...[1, 2, 3].map((w) => ({
        value: `${w}w`,
        label: `${w} week${w > 1 ? "s" : ""}`,
      })),
      ...[1, 2, 3].map((m) => ({
        value: `${m}m`,
        label: `${m} month${m > 1 ? "s" : ""}`,
      })),
    ];
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 mt-6">
      <h2 className="text-2xl font-bold capitalize text-center text-gray-800">
        {step === "create"
          ? "Create New PCD"
          : step === "addRegion"
          ? "Add Region"
          : step === "deleteRegion"
          ? "Delete Region"
          : step === "updateLease"
          ? "Update Lease"
          : "Upgrade Region"}
      </h2>

      {/* Short Name + Region Name */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full">
          <label className="block text-gray-700 mb-1" htmlFor="shortName">
            PCD Short Name
          </label>
          {step === "create" ? (
            <input
              type="text"
              name="shortName"
              id="shortName"
              placeholder="Enter Short Name"
              value={formData.shortName}
              onChange={(e) => {
                if (/\s/.test(e.target.value)) return;
                handleInputChange(e);
              }}
              onKeyDown={(e) => {
                if (e.key === " ") e.preventDefault();
              }}
              required
              className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          ) : (
            <select
              name="shortName"
              id="shortName"
              value={formData.shortName}
              onChange={handleInputChange}
              required
              className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
            >
              <option value="">Select Short Name</option>
              {shortNames.map((ns) => (
                <option key={ns} value={ns}>
                  {ns}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="w-full">
          <label className="block text-gray-700 mb-1" htmlFor="regionName">
            Region Name
          </label>
          {["addRegion", "create"].includes(step) ? (
            step === "addRegion" ? (
              <input
                type="text"
                name="regionName"
                id="regionName"
                placeholder="Enter Region Name"
                value={formData.regionName}
                onChange={(e) => {
                  if (/\s/.test(e.target.value)) return;
                  handleInputChange(e);
                }}
                onKeyDown={(e) => {
                  if (e.key === " ") e.preventDefault();
                }}
                required
                className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            ) : (
              <input
                type="text"
                name="regionName"
                id="regionName"
                value="Infra"
                disabled
                className="w-full border px-4 py-3 rounded-xl bg-gray-200 text-gray-500 cursor-not-allowed opacity-60"
              />
            )
          ) : ["deleteRegion", "updateLease", "upgrade"].includes(step) ? (
            <select
              name="regionName"
              id="regionName"
              value={formData.regionName}
              onChange={handleInputChange}
              required
              disabled={formData.shortName === ""}
              className={`w-full border px-4 py-3 rounded-xl transition-all ${
                formData.shortName === ""
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed opacity-60"
                  : "focus:outline-none focus:ring-2 focus:ring-blue-400"
              }`}
            >
              <option value="">Select Region</option>
              {regionNames.map((region) => {
                const isInfra = region.toLowerCase() === "infra";
                const hasWorkloadRegions = regionNames.some(
                  (r) => r.toLowerCase() !== "infra"
                );
                return (
                  <option
                    key={region}
                    value={
                      isInfra && hasWorkloadRegions && step === "deleteRegion"
                        ? ""
                        : region
                    }
                    disabled={
                      isInfra && hasWorkloadRegions && step === "deleteRegion"
                    }
                  >
                    {region}
                    {isInfra && hasWorkloadRegions && step === "deleteRegion"
                      ? " (Delete other regions first)"
                      : ""}
                  </option>
                );
              })}
            </select>
          ) : null}
        </div>
      </div>

      {/* Admin Email + Password */}
      {["create", "addRegion"].includes(step) && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full">
            <label htmlFor="adminEmail" className="block text-gray-700 mb-1">
              Admin Email
            </label>
            <input
              type="email"
              name="adminEmail"
              id="adminEmail"
              placeholder={
                step === "create"
                  ? "Enter Admin Email Address"
                  : "Will be same as Infra Region"
              }
              value={formData.adminEmail}
              onChange={(e) => {
                if (/\s/.test(e.target.value)) return;
                handleInputChange(e);
              }}
              onKeyDown={(e) => {
                if (e.key === " ") e.preventDefault();
              }}
              disabled={step !== "create"}
              required
              className={`w-full border px-4 py-3 rounded-xl ${
                step !== "create"
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed opacity-60"
                  : "focus:outline-none focus:ring-2 focus:ring-blue-400"
              }`}
            />
          </div>
          <div className="w-full">
            <label className="block text-gray-700 mb-1">Admin Password</label>
            <PasswordInput
              value={formData.adminPassword}
              onChange={handleInputChange}
            />
          </div>
        </div>
      )}

      {/* DB Backend + Dataplane + Chart URL */}
      {["create", "addRegion", "upgrade"].includes(step) && (
        <div className="flex flex-col md:flex-row gap-4">
          {step !== "upgrade" && (
            <div className="w-full md:w-1/3">
              <label htmlFor="dbBackend" className="block text-gray-700 mb-1">
                DB Backend
              </label>
              {step === "create" ? (
                <select
                  name="dbBackend"
                  id="dbBackend"
                  value={formData.dbBackend}
                  onChange={handleInputChange}
                  required
                  className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                >
                  <option value="">Choose a Database </option>
                  {dbBackendOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name="dbBackend"
                  id="dbBackend"
                  value={formData.dbBackend}
                  disabled
                  placeholder="Will be same as Infra region"
                  className="w-full border px-4 py-3 rounded-xl bg-gray-200 text-gray-500 cursor-not-allowed opacity-60"
                />
              )}
            </div>
          )}

          {/* Dataplane */}
          {step !== "upgrade" && (
            <div className="w-full md:w-1/3">
              <label htmlFor="cluster" className="block text-gray-700 mb-1">
                Dataplane
              </label>
              {step === "create" ? (
                <select
                  id="cluster"
                  name="cluster"
                  value={formData.cluster}
                  onChange={handleInputChange}
                  className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                >
                  <option value="">Select Dataplane</option>
                  {datplaneOptions.map(({ dataplane }) => (
                    <option key={dataplane} value={dataplane}>
                      {dataplane}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name="cluster"
                  id="cluster"
                  value={formData.cluster}
                  disabled
                  placeholder="Will be same as Infra region"
                  className="w-full border px-4 py-3 rounded-xl bg-gray-200 text-gray-500 cursor-not-allowed opacity-60"
                />
              )}
            </div>
          )}
          {/* Chart Version */}
          <div className="w-full md:w-1/3">
            <label htmlFor="charturl" className="block text-gray-700 mb-1">
              Chart Version
            </label>
            {step === "create" || step === "upgrade" ? (
              <>
                {!showCustomInput && (
                  <select
                    name="charturl"
                    id="charturl"
                    value={formData.charturl}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "custom") {
                        setFormData((prev) => ({
                          ...prev,
                          charturl: "custom",
                        }));
                        setShowCustomInput(true);
                      } else {
                        setFormData((prev) => ({ ...prev, charturl: value }));
                        setShowCustomInput(false);
                      }
                    }}
                    required={!showCustomInput}
                    className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                  >
                    <option value="">Choose PCD Version</option>
                    {charts.map(({ version, location }) => (
                      <option key={location} value={location}>
                        {version}
                      </option>
                    ))}
                    {(step === "create" || step === "upgrade") && (
                      <option value="custom">Custom Chart</option>
                    )}
                  </select>
                )}

                {showCustomInput && (
                  <input
                    type="text"
                    name="charturl"
                    placeholder="Enter custom chart URL"
                    value={
                      formData.charturl === "custom" ? "" : formData.charturl
                    }
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        charturl: e.target.value,
                      }))
                    }
                    required
                    className="w-full border px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                )}
              </>
            ) : (
              <>
                {/* Hidden actual value to keep it in the form */}
                <input
                  type="hidden"
                  name="charturl"
                  value={formData.charturl}
                />
                {/* Display-only input with filename */}
                <input
                  id="displayCharturl"
                  disabled
                  value={getFilenameWithoutExtension(formData.charturl)}
                  placeholder="Will be same as Infra region"
                  className="w-full border px-4 py-3 rounded-xl bg-gray-200 text-gray-500 cursor-not-allowed opacity-60"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Lease Duration + Lease Date */}
      {["create", "addRegion", "updateLease"].includes(step) && isNonProd && (
        <div className="flex flex-col md:flex-row gap-4 w-full">
          {/* Lease Duration */}
          <div className="w-full md:w-1/2">
            <label htmlFor="leaseSelector" className="block text-gray-700 mb-1">
              {step === "updateLease"
                ? "Set New Lease Duration"
                : "Lease Duration"}
            </label>
            <select
              id="leaseSelector"
              value={formData.leaseDuration}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setFormData((prev) => ({
                    ...prev,
                    leaseDuration: "",
                    leaseDate: "",
                  }));
                  return;
                }
                const now = new Date();
                const leaseDate = new Date(now);

                if (val.endsWith("w")) {
                  leaseDate.setDate(now.getDate() + parseInt(val) * 7);
                } else if (val.endsWith("m")) {
                  leaseDate.setMonth(now.getMonth() + parseInt(val));
                }

                setFormData((prev) => ({
                  ...prev,
                  leaseDuration: val,
                  leaseDate: leaseDate.toISOString().split("T")[0],
                }));
              }}
              className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
            >
              <option value="">Select Duration</option>
              {leaseOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Lease Expiry Date */}
          <div className="w-full md:w-1/2">
            <label htmlFor="leaseDate" className="block text-gray-700 mb-1">
              Lease Expiry Date
            </label>
            <input
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
              placeholder="dd/mm/yyyy"
              required
              className="w-full border px-4 py-3 rounded-xl bg-gray-200 text-gray-500 cursor-not-allowed opacity-60"
            />
          </div>
        </div>
      )}

      {/* HTTP Certs */}
      {["create", "upgrade"].includes(step) && isNonProd && (
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <div className="w-full flex items-center gap-3">
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
          <div className="flex flex-wrap gap-2 items-center border px-3 py-2 rounded-xl focus-within:ring-2 focus-within:ring-blue-400">
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
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                    className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    &times;
                  </button>
                </span>
              ))}

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
                    } as React.ChangeEvent<HTMLInputElement>);
                  }
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              className="flex-1 min-w-[120px] border-none outline-none focus:ring-0"
            />
          </div>

          {/* Optional tag suggestions */}
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
                    } as React.ChangeEvent<HTMLInputElement>);
                  }
                }}
                className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm hover:bg-gray-300 cursor-pointer"
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
          placeholder="Enter Reason for Extending/Shortening the Lease!"
          value={formData.note}
          onChange={handleInputChange}
          required
          className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      )}

      {/* Token &*/}
      {showTokenInput && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-opacity-50 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
            <h3 className="text-xl font-semibold mb-4">
              Enter Production Bork Token
            </h3>
            <input
              ref={tokenInputRef}
              type="text"
              name="token"
              value={formData.token}
              onChange={(e) => {
                if (/\s/.test(e.target.value)) return;
                handleInputChange(e);
              }}
              onKeyDown={(e) => {
                if (e.key === " ") e.preventDefault();
              }}
              className="w-full border px-4 py-2 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter Bork Token"
            />
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowTokenInput(false);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation */}
      {showDeleteConfirm && step === "deleteRegion" && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-opacity-50 z-50"
          role="dialog"
          aria-modal="true"
        >
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
              ref={deleteInputRef}
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
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit & Reset */}
      <div className="flex justify-between items-center">
        <button
          type="submit"
          className="bg-blue-700 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition cursor-pointer"
        >
          Submit
        </button>

        <span
          onClick={() => {
            setSubmissionSuccess(null);
            resetForm();
          }}
          className="cursor-pointer text-blue-600 hover:text-red-600 font-semibold"
        >
          Reset Form
        </span>
      </div>

      {/* Upgrade Note */}
      {step === "upgrade" && (
        <div className="mt-4 text-gray-700">
          Note: If you like to schedule this upgrade for later, you can do so
          using{" "}
          <a
            href={
              environmentOptions.find((e) => e.value === formData.environment)
                ?.tempusUrl || "#"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            Tempus
          </a>
          .
        </div>
      )}
    </form>
  );
};

export default DynamicForm;
