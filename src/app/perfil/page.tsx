import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";
import ProfileShell from "@/components/ProfileShell";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = getStore();
  const users = await store.listUsers();
  const me = users.find((u) => u.id === session.id) ?? null;
  if (!me) redirect("/login");

  const { reports: myReports } = await store.listReports({
    createdBy: session.id,
    city: process.env.NEXT_PUBLIC_CITY || "Roldanillo",
  });

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <Header />
      <ProfileShell user={me} reports={myReports} />
    </div>
  );
}