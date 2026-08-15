import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { CATEGORIES } from "@/lib/types";
import Header from "@/components/Header";
import ChannelShell from "@/components/ChannelShell";

export const dynamic = "force-dynamic";

export default async function CanalPage({
  params,
}: {
  params: Promise<{ canal: string }>;
}) {
  const { canal } = await params;
  const cat = CATEGORIES.includes(canal as (typeof CATEGORIES)[number])
    ? (canal as (typeof CATEGORIES)[number])
    : null;
  if (!cat) notFound();

  const store = getStore();
  const { reports, total } = await store.listReports({ category: cat }, { page: 1, limit: 20 });
  const commentCounts = await store.commentCountsByReport(reports.map((r) => r.id));

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <Header />
      <ChannelShell
        canal={cat}
        initialReports={reports}
        initialTotal={total}
        initialCommentCounts={commentCounts}
      />
    </div>
  );
}