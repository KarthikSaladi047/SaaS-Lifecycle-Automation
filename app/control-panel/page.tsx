"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "../components/PasswordInput";
import NavBar from "../components/NavBar";
import { useSession } from "next-auth/react";
import Image from "next/image";

type Step =
  | "select"
  | "create"
  | "addRegion"
  | "deleteRegion"
  | "updateLease"
  | "upgrade";

interface Chart {
  version: string;
  location: string;
}

interface Customer {
  customer: string;
  regions: Region[];
}

interface Region {
  region_name: string;
  namespace: string;
  chart_url?: string;
  db_backend?: string;
  use_du_specific_le_http_cert?: boolean;
  lease_date?: string;
}

interface AdminEmail {
  shortname: string;
  admin_email: string;
}

interface Artifact {
  artifact_type: string;
  location: string;
}

interface Release {
  version: string;
  artifacts: Artifact[];
}

interface ReleaseResponse {
  releases: Release[];
}

const colorClasses: Record<string, string> = {
  blue: "bg-blue-600 hover:bg-blue-700",
  green: "bg-green-600 hover:bg-green-700",
  red: "bg-red-600 hover:bg-red-700",
  purple: "bg-purple-600 hover:bg-purple-700",
  yellow: "bg-yellow-600 hover:bg-yellow-700",
};

const environmentOptions = [
  { value: "", label: "Select Environment" },
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "qa", label: "QA" },
  { value: "dev", label: "Dev" },
];

const dbBackendOptions = [
  { value: "", label: "Select DB Backend" },
  { value: "mysql", label: "Local MySQL" },
];

const slackChannelLinks: Record<string, string> = {
  production: "https://platform9.slack.com/archives/C037R987G",
  staging: "https://platform9.slack.com/archives/C08GP881QSC",
  qa: "https://platform9.slack.com/archives/C08G0RZG1A6",
  dev: "https://platform9.slack.com/archives/C01E7254V9V",
};

const tempusUrl = "https://tempus-prod.platform9.horse/api/v1/releases";

function setWithExpiry<T>(key: string, value: T, ttl: number): void {
  const now = new Date().getTime();
  localStorage.setItem(key, JSON.stringify({ value, expiry: now + ttl }));
}

function getWithExpiry<T>(key: string): T | null {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;
  try {
    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export default function ManagePCDPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [step, setStep] = useState<Step>("select");
  const [infraNamespaces, setInfraNamespaces] = useState<string[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [regionNames, setRegionNames] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(
    null
  );
  const [formData, setFormData] = useState({
    environment: "",
    shortName: "",
    adminEmail: "",
    adminPassword: "",
    regionName: "",
    dbBackend: "",
    charturl: "",
    leaseDate: "",
    use_du_specific_le_http_cert: false,
    userEmail: "",
    note: "",
  });

  const resetForm = () => {
    setFormData((prev) => ({
      ...prev,
      shortName: "",
      adminEmail: "",
      adminPassword: "",
      regionName: "",
      leaseDate: "",
      dbBackend: "",
      charturl: "",
      use_du_specific_le_http_cert: false,
    }));
    setSubmissionSuccess(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (step === "create") {
        setSubmissionSuccess(
          `New PCD "${formData.shortName}" creation is Initiated!`
        );
        console.log("Creating new PCD", formData);
        // ... API call
      } else if (step === "addRegion") {
        setSubmissionSuccess(
          `New region "${formData.regionName}" creation is Initiated for PCD "${formData.shortName}"!`
        );
        console.log("Adding region", formData);
        // ... API call
      } else if (step === "deleteRegion") {
        if (!showDeleteConfirm) {
          setShowDeleteConfirm(true);
          return;
        }
        if (deleteConfirmInput !== "Delete Me") {
          alert('Please type "Delete Me" exactly to confirm deletion.');
          return;
        }
        setSubmissionSuccess(
          `Deletion process started for PCD "${formData.shortName}", Region "${formData.regionName}"!`
        );
        console.log("Deleting region", formData);
        // ... API call
        // const response = await fetch("/api/deleteRegion", {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({
        //     shortName: formData.shortName,
        //     regionName: formData.regionName,
        //     environment: formData.environment,
        //   }),
        // });

        // if (!response.ok) {
        //   throw new Error("Failed to delete region");
        // }

        // const result = await response.json();
        // console.log("Region deleted:", result);

        setShowDeleteConfirm(false);
        setDeleteConfirmInput("");
      } else if (step === "updateLease") {
        setSubmissionSuccess(
          `Lease is updated for PCD "${formData.shortName}, Region "${formData.regionName}" !`
        );
        console.log("Updating lease", formData);
        // ... API call
      }
    } catch (error) {
      console.error("Submission error:", error);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
    }
  }, [router, status]);

  useEffect(() => {
    if (
      !formData.environment ||
      !session?.user?.email ||
      status !== "authenticated"
    )
      return;

    const CACHE_TTL = 60 * 1000;
    const CHARTS_CACHE_TTL = 60 * 60 * 1000;

    const fetchData = async () => {
      try {
        setFormData((prev) => ({
          ...prev,
          userEmail: session.user?.email ?? "",
        }));

        if (step === "upgrade") {
          const prodEnvs = ["production", "staging"];
          setSubmissionSuccess("Redirecting to tempus!");
          router.push(
            prodEnvs.includes(formData.environment)
              ? "https://tempus-prod.platform9.horse"
              : "https://tempus-dev.platform9.horse"
          );
          return;
        }

        const data: Customer[] = await (async () => {
          const cacheKey = `fetchData_${formData.environment}`;
          const cached = getWithExpiry<Customer[]>(cacheKey);
          if (cached) return cached;

          const res = await fetch(`/api/fetchData?env=${formData.environment}`);
          if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
          const json: Customer[] = await res.json();
          setWithExpiry(cacheKey, json, CACHE_TTL);
          return json;
        })();

        const infraOnly: Region[] = data.flatMap((customer) =>
          customer.regions.filter((region) => region.region_name === "Infra")
        );
        setInfraNamespaces(infraOnly.map((r) => r.namespace));

        await (async () => {
          const cacheKey = "chartsListCache";
          const cachedCharts = getWithExpiry<Chart[]>(cacheKey);
          if (cachedCharts) {
            setCharts(cachedCharts);
            return;
          }

          const res = await fetch(tempusUrl, {
            headers: { Authorization: `OAuth ${session.accessToken}` },
          });

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`API error: ${res.status} ${errorText}`);
          }

          const json: ReleaseResponse = await res.json();
          const chartItems: Chart[] = json.releases.flatMap((release) =>
            release.artifacts
              .filter(
                (artifact) =>
                  artifact.artifact_type === "pcd-chart" && artifact.location
              )
              .map((artifact) => ({
                version: release.version,
                location: artifact.location,
              }))
          );

          setWithExpiry(cacheKey, chartItems, CHARTS_CACHE_TTL);
          setCharts(chartItems);
        })();

        const customerData = data.find(
          (item) => item.customer === formData.shortName
        );
        if (customerData) {
          setRegionNames(
            customerData.regions.map((region) => region.region_name)
          );
        }

        if (step === "addRegion" && formData.shortName) {
          const adminEmails: AdminEmail[] = await (async () => {
            const cacheKey = `fetchCustomers_${formData.environment}`;
            const cached = getWithExpiry<AdminEmail[]>(cacheKey);
            if (cached) return cached;

            const res = await fetch(
              `/api/fetchCustomers?env=${formData.environment}`
            );
            if (!res.ok)
              throw new Error(`Failed to fetch customers: ${res.status}`);
            const json: AdminEmail[] = await res.json();
            setWithExpiry(cacheKey, json, CACHE_TTL);
            return json;
          })();

          const matchedItem = adminEmails.find(
            (item) => item.shortname === formData.shortName
          );
          const matchedRegion = infraOnly.find(
            (r) => r.namespace === formData.shortName
          );

          setFormData((prev) => ({
            ...prev,
            adminEmail: matchedItem?.admin_email ?? "",
            charturl: matchedRegion?.chart_url || "",
            dbBackend: matchedRegion?.db_backend || "mysql",
            use_du_specific_le_http_cert:
              matchedRegion?.use_du_specific_le_http_cert ?? false,
            leaseDate: matchedRegion?.lease_date ?? "",
          }));
        }
      } catch (err) {
        console.error("Error fetching", err);
      }
    };

    fetchData();
  }, [formData.environment, formData.shortName, step, session, status, router]);

  return (
    <>
      <NavBar isControlPanel={true} />
      <div
        className="min-h-screen bg-cover bg-center flex flex-col items-center justify-start pt-20"
        style={{
          backgroundImage: "url('/bg.png')",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          opacity: "0.9",
        }}
      >
        <div className="w-full max-w-xl bg-white/90 backdrop-blur-md shadow-2xl rounded-3xl p-10 mx-4 border border-gray-300 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)]">
          {/* Step: Select */}
          {step === "select" && (
            <>
              <h2 className="text-3xl font-bold mb-6 text-center text-yellow-800">
                Manage PCD
              </h2>
              <h2 className="text-2xl font-semibold mb-6 mt-8 text-left text-gray-800">
                Select Environment:
              </h2>
              <select
                name="environment"
                value={formData.environment}
                onChange={handleInputChange}
                required
                className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
              >
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
                  const disabled =
                    (envRestricted &&
                      !["qa", "staging", "dev"].includes(
                        formData.environment
                      )) ||
                    !formData.environment;

                  return (
                    <button
                      key={label}
                      onClick={() => setStep(targetStep)}
                      disabled={disabled}
                      className={`w-full px-4 py-3 rounded-xl transition font-medium text-white cursor-pointer ${
                        disabled
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : colorClasses[color]
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step: Form */}
          {[
            "create",
            "addRegion",
            "deleteRegion",
            "updateLease",
            "upgrade",
          ].includes(step) &&
            (submissionSuccess ? (
              // Show success message instead of form
              <div className="p-6 bg-green-100 border border-green-400 text-green-700 rounded flex flex-col items-center space-y-4 mt-6">
                <span className="text-4xl">
                  <Image
                    className={
                      step === "deleteRegion" ? "w-40 h-60" : "w-40 h-40"
                    }
                    src={
                      step === "upgrade"
                        ? "/redirect.png"
                        : step === "deleteRegion"
                        ? "/trash.png"
                        : "/tickmark.png"
                    }
                    alt={
                      step === "upgrade"
                        ? "Redirecting"
                        : step === "deleteRegion"
                        ? "Delete Region"
                        : "Success"
                    }
                    width={160}
                    height={160}
                    priority
                  />
                </span>
                <p className="text-center text-lg">{submissionSuccess}</p>
                <a
                  href={slackChannelLinks[formData.environment] || ""}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-600 hover:text-blue-800"
                >
                  {["upgrade", "updateLease"].includes(step)
                    ? ""
                    : "Check progress in Slack Channel"}
                </a>
                {step !== "upgrade" && (
                  <button
                    onClick={resetForm}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Back to Form
                  </button>
                )}
              </div>
            ) : (
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

                {/* Shortname */}
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

                {/* Email */}
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

                {/* Password */}
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
                  <select
                    name="regionName"
                    value={formData.regionName}
                    onChange={handleInputChange}
                    required
                    disabled={formData.shortName == ""}
                    className="w-full border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">-- Select Region --</option>
                    {regionNames.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
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
                    <option value="">
                      {step === "addRegion"
                        ? "Version will be same as Infra Region"
                        : "Choose PCD Version"}
                    </option>
                    {charts.map(({ version, location }) => (
                      <option key={location} value={location}>
                        {version}
                      </option>
                    ))}
                  </select>
                )}

                {/* Lease Date */}
                {["create", "addRegion", "updateLease"].includes(step) &&
                  formData.environment !== "production" && (
                    <div className="w-full">
                      <label
                        className="block text-gray-600 mb-1"
                        htmlFor="leaseUntil"
                      >
                        {step === "updateLease"
                          ? "Set New Lease Date"
                          : "Lease Date"}
                      </label>
                      <input
                        type="date"
                        name="leaseDate"
                        id="leaseDate"
                        value={formData.leaseDate}
                        onChange={handleInputChange}
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
                      checked={formData.use_du_specific_le_http_cert}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          use_du_specific_le_http_cert: e.target.checked,
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

                {!(showDeleteConfirm && step === "deleteRegion") && (
                  <button
                    type="submit"
                    className="w-full bg-purple-600 text-white px-4 py-3 rounded-xl hover:bg-purple-700 transition cursor-pointer"
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
            ))}
        </div>
      </div>
    </>
  );
}
