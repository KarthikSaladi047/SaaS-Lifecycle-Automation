"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBar from "../components/NavBar";
import { useSession } from "next-auth/react";

import {
  Step,
  Chart,
  GroupedData,
  Region,
  ReleaseResponse,
  AdminEmail,
} from "../types/pcd";

import { dbBackendOptions, tempus_urls, tempusUrl } from "../constants/pcd";
import StepSelect from "../components/control_panel/StepSelect";
import SuccessMessage from "../components/control_panel/SucessMessage";
import DynamicForm from "../components/control_panel/DynamicForm";

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
  const [showTokenInput, setShowTokenInput] = useState(false);
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
          const targetURL = tempus_urls[formData.environment];
          setSubmissionSuccess("Redirecting to tempus!");
          router.push(targetURL);
          return;
        }

        const data: GroupedData[] = await (async () => {
          const cacheKey = `fetchData_${formData.environment}`;
          const cached = getWithExpiry<GroupedData[]>(cacheKey);
          if (cached) return cached;

          const res = await fetch(`/api/fetchData?env=${formData.environment}`);
          if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
          const json: GroupedData[] = await res.json();
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
            dbBackend: "mysql",
            use_du_specific_le_http_cert:
              matchedRegion?.use_du_specific_le_http_cert ?? "false",
            leaseDate: matchedRegion?.lease_date ?? "",
          }));
        }
      } catch (err) {
        console.error("Error fetching", err);
      }
    };

    fetchData();
  }, [formData.environment, formData.shortName, step, session, status, router]);

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
            <StepSelect
              formData={formData}
              handleInputChange={handleInputChange}
              setStep={setStep}
            />
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
                infraNamespaces={infraNamespaces}
                regionNames={regionNames}
                dbBackendOptions={dbBackendOptions}
                setStep={setStep}
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
    </>
  );
}
