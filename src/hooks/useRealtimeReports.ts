"use client";

import { useEffect, useState } from "react";
import { Report } from "@/lib/types";

const CITY = process.env.NEXT_PUBLIC_CITY || "Roldanillo";

function normalize(report: Report): Report {
  if (typeof report.createdAt === "string") {
    return { ...report, createdAt: new Date(report.createdAt) };
  }
  if (report.resolvedAt && typeof report.resolvedAt === "string") {
    return { ...report, resolvedAt: new Date(report.resolvedAt) };
  }
  return report;
}

function sameCity(report: Report): boolean {
  return !report.city || report.city === CITY;
}

export function useRealtimeReports(
  initial: Report[],
  initialCounts: Record<string, number> = {},
) {
  const [reports, setReports] = useState<Report[]>(initial);
  const [commentCounts, setCommentCounts] =
    useState<Record<string, number>>(initialCounts);

  useEffect(() => {
    const es = new EventSource("/api/events");

    const onCreated = (e: Event) => {
      try {
        const report = normalize(JSON.parse((e as MessageEvent).data) as Report);
        if (!sameCity(report)) return;
        setReports((prev) =>
          prev.some((r) => r.id === report.id) ? prev : [report, ...prev],
        );
      } catch {
        /* ignorar datos no válidos */
      }
    };

    const onDeleted = (e: Event) => {
      try {
        const { id } = JSON.parse((e as MessageEvent).data) as { id: string };
        setReports((prev) => prev.filter((r) => r.id !== id));
      } catch {
        /* ignorar */
      }
    };

    const onUpdated = (e: Event) => {
      try {
        const report = normalize(JSON.parse((e as MessageEvent).data) as Report);
        if (!sameCity(report)) return;
        setReports((prev) =>
          prev.map((r) => (r.id === report.id ? report : r)),
        );
      } catch {
        /* ignorar */
      }
    };

    const onCommentCreated = (e: Event) => {
      try {
        const { reportId } = JSON.parse((e as MessageEvent).data) as {
          reportId: string;
        };
        setCommentCounts((prev) => ({
          ...prev,
          [reportId]: (prev[reportId] ?? 0) + 1,
        }));
      } catch {
        /* ignorar */
      }
    };

    es.addEventListener("report.created", onCreated);
    es.addEventListener("report.deleted", onDeleted);
    es.addEventListener("report.updated", onUpdated);
    es.addEventListener("comment.created", onCommentCreated);

    return () => {
      es.removeEventListener("report.created", onCreated);
      es.removeEventListener("report.deleted", onDeleted);
      es.removeEventListener("report.updated", onUpdated);
      es.removeEventListener("comment.created", onCommentCreated);
      es.close();
    };
  }, []);

  return { reports, setReports, commentCounts, setCommentCounts };
}