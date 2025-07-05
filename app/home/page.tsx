"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NavBar from "../components/common/NavBar";
import Table from "../components/home/Table";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { GroupedData, AdminEmail } from "../types/pcd";

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  const [environment, SetEnvironment] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedEnv") || "us-prod";
    }
    return "us-prod";
  });

  const [tableData, setTableData] = useState<GroupedData[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleEnvChange = (env: string) => {
    SetEnvironment(env);
    localStorage.setItem("selectedEnv", env);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    setLoading(true);

    const fetchMainData = fetch(`/api/fetchData?env=${environment}`)
      .then((res) => res.json())
      .then((data: GroupedData[]) => data);

    const fetchEmails = fetch(`/api/fetchCustomers?env=${environment}`)
      .then((res) => res.json())
      .then((data: AdminEmail[]) => {
        const emailMap: Record<string, string> = {};
        data.forEach((item) => {
          emailMap[item.shortname] = item.admin_email;
        });
        return emailMap;
      });

    Promise.all([fetchMainData, fetchEmails])
      .then(([mainData, emailMap]) => {
        setTableData(mainData);
        setEmails(emailMap);
      })
      .catch((err) => console.error("Fetch error:", err))
      .finally(() => setLoading(false));
  }, [environment, status]);

  return (
    <div className="w-full min-h-screen bg-gray-700">
      <NavBar
        isControlPanel={false}
        selectedEnv={environment}
        onEnvChange={handleEnvChange}
        loading={loading}
      />
      <main className="p-6 space-y-4 items-center">
        {loading ? (
          <div className="flex justify-center items-center h-94">
            <LoadingSpinner />
          </div>
        ) : (
          <Table
            data={tableData}
            customerEmails={emails}
            environment={environment}
          />
        )}
      </main>
    </div>
  );
}
