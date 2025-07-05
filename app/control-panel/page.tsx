"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import NavBar from "../components/common_components/NavBar";
import { useSession } from "next-auth/react";
import { CHARTS_CACHE_TTL, environmentOptions } from "../constants/pcd";

import {
  Step,
  Chart,
  GroupedData,
  ReleaseResponse,
  AdminEmail,
  FormData,
  Region,
  DataPlane,
} from "../types/pcd";

import { dbBackendOptions, tempusUrl } from "../constants/pcd";
import StepSelect from "../components/control_panel_components/StepSelect";
import SuccessMessage from "../components/control_panel_components/SucessMessage";
import DynamicForm from "../components/control_panel_components/DynamicForm";
import Joke from "../components/control_panel_components/Joke";
import LoadingSpinner from "../components/common_components/LoadingSpinner";

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
  const [shortNames, setShortNames] = useState<string[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [regionNames, setRegionNames] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(
    null
  );
  const [data, setData] = useState<GroupedData[]>([]);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [adminEmails, setAdminEmails] = useState<AdminEmail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const prevEnvRef = useRef<string | null>(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [datplaneOptions, setDatplaneOptions] = useState<DataPlane[]>([]);
  const [formData, setFormData] = useState<FormData>({
    environment: "",
    shortName: "",
    adminEmail: "",
    adminPassword: "",
    regionName: "",
    dbBackend: "",
    charturl: "",
    leaseDate: "",
    leaseDuration: "",
    cluster: "",
    use_du_specific_le_http_cert: "",
    userEmail: "",
    note: "",
    token: "",
    tags: "",
  });
  const userEmailSetRef = useRef(false);

  const resetForm = () => {
    setFormData((prev) => ({
      environment: prev.environment,
      userEmail: prev.userEmail,
      shortName: "",
      adminEmail: "",
      adminPassword: "",
      regionName: "",
      leaseDate: "",
      leaseDuration: "",
      dbBackend: "",
      charturl: "",
      cluster: "",
      use_du_specific_le_http_cert: "",
      token: "",
      tags: "",
      note: "",
    }));
    setSubmissionSuccess(null);
    setShowTokenInput(false);
    setShowDeleteConfirm(false);
    setDeleteConfirmInput("");
    setIsError(false);
    setShowCustomInput(false);
  };
  const currentEnvType = environmentOptions.find(
    (env) => env.value === formData.environment
  )?.type;

  const isProd = currentEnvType === "prod";

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
      if (isProd && !showTokenInput) {
        setShowTokenInput(true);
        return;
      }

      if (step === "deleteRegion") {
        if (!showDeleteConfirm) {
          setShowDeleteConfirm(true);
          return;
        }

        if (deleteConfirmInput !== "Delete Me") {
          alert('Please type "Delete Me" exactly to confirm deletion.');
          return;
        }
      }

      setIsLoading(true);

      let endpoint = "";
      let actionLabel = "";
      let responseMessage = "";

      switch (step) {
        case "create":
          endpoint = "/api/createRegion";
          actionLabel = "PCD creation";
          responseMessage = `New PCD "${formData.shortName}" creation is initiated!`;
          break;

        case "addRegion":
          endpoint = "/api/createRegion";
          actionLabel = "Region addition";
          responseMessage = `New Region "${formData.regionName}" added to PCD "${formData.shortName}"!`;
          break;

        case "deleteRegion":
          endpoint = "/api/deleteRegion";
          actionLabel = "Region deletion";
          responseMessage = `Region "${formData.regionName}" deleted from PCD "${formData.shortName}"!`;
          break;

        case "updateLease":
          endpoint = "/api/updateLease";
          actionLabel = "Lease update";
          responseMessage = `Lease updated for PCD "${formData.shortName}", Region "${formData.regionName}"!`;
          break;

        case "upgrade":
          endpoint = "/api/upgradeRegion";
          actionLabel = "Upgrade Region";
          responseMessage = `Upgrade initiated for PCD "${formData.shortName}", Region "${formData.regionName}"!`;
          break;

        default:
          console.warn("Unknown step");
          return;
      }

      const response = await fetch(endpoint, {
        method: step === "deleteRegion" ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorMessage = "Unknown error occurred";
        try {
          const errorJson = await response.json();
          errorMessage = errorJson.error || JSON.stringify(errorJson);
        } catch {
          errorMessage = await response.text();
        }
        setIsError(true);
        setSubmissionSuccess(`${actionLabel} failed: ${errorMessage}`);
        return;
      }

      const result = await response.json();
      console.log(`${actionLabel} result:`, result);
      setSubmissionSuccess(responseMessage);
      setShouldRefetch(true);
    } catch (error) {
      console.error("Submission error:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // check Auth
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
    }
  }, [router, status]);

  // fetch Regions Data
  useEffect(() => {
    if (formData.environment !== prevEnvRef.current) {
      resetForm();
      prevEnvRef.current = formData.environment;
    }

    if (formData.environment) {
      const fetchGroupedData = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/fetchData?env=${formData.environment}`);
          if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
          const json: GroupedData[] = await res.json();
          setData(json);
        } catch (err) {
          console.error("Error fetching grouped data", err);
        } finally {
          setIsLoading(false);
          if (shouldRefetch) setShouldRefetch(false);
        }
      };

      fetchGroupedData();
    }
  }, [step, formData.environment, shouldRefetch]);

  // featch Clusters Data
  useEffect(() => {
    if (formData.environment !== prevEnvRef.current) {
      resetForm();
      prevEnvRef.current = formData.environment;
    }

    if (formData.environment) {
      const fetchClusterData = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(
            `/api/fetchClusters?env=${formData.environment}`
          );
          if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
          const json: DataPlane[] = await res.json();
          setDatplaneOptions(json);
        } catch (err) {
          console.error("Error fetching grouped data", err);
        } finally {
          setIsLoading(false);
          if (shouldRefetch) setShouldRefetch(false);
        }
      };

      fetchClusterData();
    }
  }, [step, formData.environment, shouldRefetch]);

  // fetch Customers
  useEffect(() => {
    if (formData.environment !== prevEnvRef.current && step !== "upgrade") {
      resetForm();
      prevEnvRef.current = formData.environment;
    }
    if (!formData.environment) return;

    const fetchAdminEmails = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/fetchCustomers?env=${formData.environment}`
        );
        if (!res.ok)
          throw new Error(`Failed to fetch customers: ${res.status}`);

        const json: AdminEmail[] = await res.json();
        setAdminEmails(json);
      } catch (err) {
        console.error("Error fetching admin emails", err);
      } finally {
        setIsLoading(false);
        if (shouldRefetch) setShouldRefetch(false);
      }
    };

    fetchAdminEmails();
  }, [formData.environment, shouldRefetch, step]);

  // Fill region details
  useEffect(() => {
    const fillData = async () => {
      setIsLoading(true);
      try {
        // Set Shortnames
        const infraOnly: Region[] = data.flatMap((customer) =>
          customer.regions.filter((region) => region.region_name === "Infra")
        );
        setShortNames(infraOnly.map((r) => r.namespace));

        // Find region names for selected customer
        const customerData = data.find(
          (item) => item.customer === formData.shortName
        );
        if (customerData) {
          setRegionNames(
            customerData.regions.map((region) => region.region_name)
          );
        }

        // Set form defaults
        if (
          (step === "addRegion" ||
            step === "updateLease" ||
            step === "upgrade") &&
          formData.shortName
        ) {
          const matchedItem = adminEmails.find(
            (item) => item.shortname === formData.shortName
          );

          const matchedCustomer = data.find(
            (c) => c.customer === formData.shortName
          );

          const matchedInfraRegion = matchedCustomer?.regions.find(
            (r) => r.region_name === "Infra"
          );

          const defaultDbBackend =
            dbBackendOptions.find((opt) => opt.isDefault)?.value || "";

          setFormData((prev) => ({
            ...prev,
            adminEmail: matchedItem?.admin_email ?? "",
            charturl: matchedInfraRegion?.chart_url || "",
            dbBackend: defaultDbBackend,
            use_du_specific_le_http_cert:
              matchedInfraRegion?.use_du_specific_le_http_cert ?? "false",
            cluster:
              matchedInfraRegion?.cluster
                .replace(/^.*?-/, "")
                .replace(/\.app\..*$/, "") || "",
          }));
        }
      } catch (err) {
        console.error("Error processing customer data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fillData();
  }, [formData.environment, formData.shortName, step, data, adminEmails]);

  // remove form
  useEffect(() => {
    resetForm();
    if (!formData.environment) {
      setStep("select");
      return;
    }
  }, [formData.environment, step]);

  // Get PCD charts from Tempus on load silently
  useEffect(() => {
    if (!session?.user.email) {
      return;
    }
    const getCharts = async () => {
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
    };
    getCharts();
  }, [session]);

  // User Email
  useEffect(() => {
    if (session?.user?.email && !userEmailSetRef.current) {
      setFormData((prev) => ({
        ...prev,
        userEmail: session.user.email ?? "",
      }));
      userEmailSetRef.current = true;
    }
  }, [session?.user?.email]);

  const getFilenameWithoutExtension = (url: string): string => {
    if (!url) return "";
    const parts = url.split("/");
    const filename = parts[parts.length - 1] || "";
    const dotIndex = filename.lastIndexOf(".");
    return dotIndex === -1 ? filename : filename.substring(0, dotIndex);
  };

  return (
    <>
      <NavBar isControlPanel={true} />
      <div className="min-h-screen bg-cover bg-center flex items-start pt-20 px-6 bg-gray-700">
        <div className="flex w-full max-w-7xl bg-white/90 backdrop-blur-md shadow-2xl rounded-3xl mx-auto border border-gray-300 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] overflow-hidden">
          {/* Left: StepSelect - 1/3 */}
          <div className="w-1/3 border-r border-gray-400 p-8">
            <StepSelect
              formData={formData}
              handleInputChange={handleInputChange}
              setStep={setStep}
            />
          </div>

          {/* Right: Form or Success - 2/3 */}
          <div className="w-2/3 p-10">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 px-6">
                <LoadingSpinner />
              </div>
            ) : (
              [
                "select",
                "create",
                "addRegion",
                "deleteRegion",
                "updateLease",
                "upgrade",
              ].includes(step) &&
              (step === "select" ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4 px-6">
                  <div className="bg-yellow-100 p-6 rounded-full shadow-md">
                    <svg
                      className="w-12 h-12 text-yellow-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 1010 10A10 10 0 0012 2z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-800">
                    Start by selecting an environment
                  </h2>
                  <p className="text-gray-600">
                    Choose an action to begin your workflow
                  </p>
                  <hr className="w-full border-t border-gray-500 my-6 opacity-50" />
                  <Joke />
                </div>
              ) : submissionSuccess ? (
                <SuccessMessage
                  step={step}
                  submissionSuccess={submissionSuccess}
                  environment={formData.environment}
                  resetForm={resetForm}
                  isError={isError}
                />
              ) : (
                <DynamicForm
                  step={step}
                  formData={formData}
                  handleInputChange={handleInputChange}
                  charts={charts}
                  shortNames={shortNames}
                  regionNames={regionNames}
                  dbBackendOptions={dbBackendOptions}
                  setFormData={setFormData}
                  handleSubmit={handleSubmit}
                  showTokenInput={showTokenInput}
                  setShowTokenInput={setShowTokenInput}
                  showDeleteConfirm={showDeleteConfirm}
                  setShowDeleteConfirm={setShowDeleteConfirm}
                  deleteConfirmInput={deleteConfirmInput}
                  setDeleteConfirmInput={setDeleteConfirmInput}
                  submissionSuccess={submissionSuccess}
                  setSubmissionSuccess={setSubmissionSuccess}
                  resetForm={resetForm}
                  setShowCustomInput={setShowCustomInput}
                  showCustomInput={showCustomInput}
                  getFilenameWithoutExtension={getFilenameWithoutExtension}
                  datplaneOptions={datplaneOptions}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
