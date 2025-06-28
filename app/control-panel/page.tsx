"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBar from "../components/common_components/NavBar";
import { useSession } from "next-auth/react";
import { CACHE_TTL, CHARTS_CACHE_TTL } from "../constants/pcd";

import {
  Step,
  Chart,
  GroupedData,
  ReleaseResponse,
  AdminEmail,
} from "../types/pcd";

import { dbBackendOptions, tempus_urls, tempusUrl } from "../constants/pcd";
import StepSelect from "../components/control_panel_components/StepSelect";
import SuccessMessage from "../components/control_panel_components/SucessMessage";
import DynamicForm from "../components/control_panel_components/DynamicForm";
import Joke from "../components/control_panel_components/Joke";

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
  const [formData, setFormData] = useState({
    environment: "",
    shortName: "",
    adminEmail: "",
    adminPassword: "",
    regionName: "",
    dbBackend: "",
    charturl: "",
    leaseDate: "",
    use_du_specific_le_http_cert: "",
    userEmail: "",
    note: "",
    token: "",
    tags: "",
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
      use_du_specific_le_http_cert: "",
      token: "",
      tags: "",
      note: "",
    }));
    setSubmissionSuccess(null);
    setShowTokenInput(false);
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
        if (formData.environment === "production" && !showTokenInput) {
          setShowTokenInput(true);
          return;
        }
        setSubmissionSuccess(
          `New PCD "${formData.shortName}" creation is Initiated!`
        );
        console.log("Creating new PCD", formData);
        // ... API call
      } else if (step === "addRegion") {
        if (formData.environment === "production" && !showTokenInput) {
          setShowTokenInput(true);
          return;
        }
        setSubmissionSuccess(
          `New region "${formData.regionName}" creation is Initiated for PCD "${formData.shortName}"!`
        );
        console.log("Adding region", formData);
        // ... API call
      } else if (step === "deleteRegion") {
        if (formData.environment === "production" && !showTokenInput) {
          setShowTokenInput(true);
          return;
        }
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

  // check Auth
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
    }
  }, [router, status]);

  // fetch Data and setShortNames
  useEffect(() => {
    resetForm();
    if (!formData.environment) {
      setStep("select");
      return;
    }
    if (formData.environment && step !== "upgrade") {
      const fetchGroupedData = async () => {
        const cacheKey = `fetchData_${formData.environment}`;
        const cached = getWithExpiry<GroupedData[]>(cacheKey);

        if (cached) {
          if (JSON.stringify(cached) !== JSON.stringify(data)) {
            setData(cached);
          }
          return;
        }

        try {
          const res = await fetch(`/api/fetchData?env=${formData.environment}`);
          if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
          const json: GroupedData[] = await res.json();

          setWithExpiry(cacheKey, json, CACHE_TTL);

          if (JSON.stringify(json) !== JSON.stringify(data)) {
            setData(json);
          }
        } catch (err) {
          console.error("Error fetching grouped data", err);
        }
      };

      // Set customer names as Shortnames
      const allCustomerNamespaces = data.map((customer) => customer.customer);
      setShortNames(allCustomerNamespaces);

      fetchGroupedData();
    }
    if (step === "upgrade") {
      const targetURL = tempus_urls[formData.environment];
      setSubmissionSuccess("Redirecting to tempus!");
      router.push(targetURL);
      return;
    }
  }, [step, formData.environment, router, data]);

  // fetch Customers
  useEffect(() => {
    if (!formData.environment) return;
    const fetchAdminEmails = async () => {
      const cacheKey = `fetchCustomers_${formData.environment}`;
      const cached = getWithExpiry<AdminEmail[]>(cacheKey);

      if (cached) {
        if (JSON.stringify(cached) !== JSON.stringify(adminEmails)) {
          setAdminEmails(cached);
        }
        return;
      }

      try {
        const res = await fetch(
          `/api/fetchCustomers?env=${formData.environment}`
        );
        if (!res.ok)
          throw new Error(`Failed to fetch customers: ${res.status}`);

        const json: AdminEmail[] = await res.json();
        setWithExpiry(cacheKey, json, CACHE_TTL);

        if (JSON.stringify(json) !== JSON.stringify(adminEmails)) {
          setAdminEmails(json);
        }
      } catch (err) {
        console.error("Error fetching admin emails", err);
      }
    };

    fetchAdminEmails();
  }, [formData.environment, adminEmails]);

  useEffect(() => {
    const matchData = async () => {
      try {
        // Set region names for selected customer
        const customerData = data.find(
          (item) => item.customer === formData.shortName
        );
        if (customerData) {
          setRegionNames(
            customerData.regions.map((region) => region.region_name)
          );
        }

        // Set form defaults if adding a region
        if (step === "addRegion" && formData.shortName) {
          const matchedItem = adminEmails.find(
            (item) => item.shortname === formData.shortName
          );

          const matchedCustomer = data.find(
            (c) => c.customer === formData.shortName
          );

          const matchedInfraRegion = matchedCustomer?.regions.find(
            (r) => r.region_name === "Infra"
          );

          setFormData((prev) => ({
            ...prev,
            adminEmail: matchedItem?.admin_email ?? "",
            charturl: matchedInfraRegion?.chart_url || "",
            dbBackend: "mysql",
            use_du_specific_le_http_cert:
              matchedInfraRegion?.use_du_specific_le_http_cert ?? "false",
            leaseDate: matchedInfraRegion?.lease_date ?? "",
          }));
        }
      } catch (err) {
        console.error("Error processing customer data", err);
      }
    };
    matchData();
  }, [formData.environment, formData.shortName, step, data, adminEmails]);

  // Get PCD charts from Tempus on load
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

        setFormData((prev) => ({
          ...prev,
          userEmail: session.user.email ?? "",
        }));
      })();
    };

    getCharts();
  }, [session]);

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
            {[
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
                  getFilenameWithoutExtension={getFilenameWithoutExtension}
                />
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
