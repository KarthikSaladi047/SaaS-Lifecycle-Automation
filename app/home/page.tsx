"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import Table from "../components/Table";
import LoadingSpinner from "../components/LoadingSpinner";

interface Region {
  region_name: string;
  fqdn: string;
  namespace: string;
  task_state: string;
  deployed_at: string;
  chart_url: string;
  owner: string;
  use_du_specific_le_http_cert: boolean;
  lease_date: string | null;
}

interface GroupedData {
  customer: string;
  regions: Region[];
}

interface AdminEmail {
  shortname: string;
  admin_email: string;
}

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  const [env, setEnv] = useState("production");
  const [tableData, setTableData] = useState<GroupedData[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    setLoading(true);

    const fetchMainData = fetch(`/api/fetchData?env=${env}`)
      .then((res) => res.json())
      .then((data: GroupedData[]) => data);

    const fetchEmails = fetch(`/api/fetchCustomers?env=${env}`)
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
  }, [env, status]);

  return (
    <div className="w-full min-h-screen bg-gray-400">
      <NavBar isControlPanel={false} selectedEnv={env} onEnvChange={setEnv} />
      <main className="p-6 space-y-4 items-center">
        {loading ? (
          <div className="flex justify-center items-center h-94">
            <LoadingSpinner />
          </div>
        ) : (
          <Table data={tableData} customerEmails={emails} env={env} />
        )}
      </main>
    </div>
  );
}

/*bg-[url('/home_bg.jpg')]*/
