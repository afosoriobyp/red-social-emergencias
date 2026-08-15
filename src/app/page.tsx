import { getStore, storeMode } from "@/lib/store";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const store = getStore();
  const { reports, total } = await store.listReports({});
  const commentCounts = await store.commentCountsByReport(
    reports.map((r) => r.id),
  );

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <Header />
      <AppShell
        initialReports={reports}
        initialTotal={total}
        initialCommentCounts={commentCounts}
        mode={storeMode()}
      />
    </div>
  );
}