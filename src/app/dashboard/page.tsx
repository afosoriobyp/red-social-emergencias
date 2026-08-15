import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "coordinador")) {
    redirect("/login");
  }

  const { reports } = await getStore().listReports({});

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <Header />
      <DashboardShell
        initialReports={reports}
        actor={{ name: session.name, role: session.role }}
      />
    </div>
  );
}