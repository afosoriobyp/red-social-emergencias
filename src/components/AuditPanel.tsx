"use client";

import { useEffect, useState } from "react";
import { AuditLog } from "@/lib/types";
import { ClipboardList, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  "report.create": "Creó reporte",
  "report.update": "Actualizó reporte",
  "report.delete": "Eliminó reporte",
  "user.create": "Creó usuario",
  "user.role": "Cambió rol",
  "user.status": "Cambió estado",
  "user.password_reset": "Restableció contraseña",
  "user.delete": "Eliminó usuario",
  "user.delete_reports": "Eliminó reportes de usuario",
  "auth.register": "Se registró",
  "auth.login": "Inició sesión",
  "auth.password_change": "Cambió contraseña",
};

const ACTION_COLORS: Record<string, string> = {
  "report.create": "bg-blue-50 text-blue-600",
  "report.update": "bg-amber-50 text-amber-600",
  "report.delete": "bg-red-50 text-red-600",
  "user.create": "bg-emerald-50 text-emerald-600",
  "user.role": "bg-indigo-50 text-indigo-600",
  "user.status": "bg-indigo-50 text-indigo-600",
  "user.password_reset": "bg-violet-50 text-violet-600",
  "user.delete": "bg-red-50 text-red-600",
  "user.delete_reports": "bg-red-50 text-red-600",
  "auth.register": "bg-slate-100 text-slate-600",
  "auth.login": "bg-slate-100 text-slate-600",
  "auth.password_change": "bg-slate-100 text-slate-600",
};

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(showSpinner: boolean) {
    if (showSpinner) setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/audit?limit=100");
      const data = (await res.json()) as { logs?: AuditLog[]; error?: string };
      if (!res.ok || !data.logs) {
        setError(data.error ?? "Error al cargar auditoría");
        return;
      }
      setLogs(data.logs);
    } catch {
      setError("Error de red al cargar auditoría");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/audit?limit=100");
        const data = (await res.json()) as { logs?: AuditLog[]; error?: string };
        if (!res.ok || !data.logs) {
          if (mounted) setError(data.error ?? "Error al cargar auditoría");
          return;
        }
        if (mounted) setLogs(data.logs);
      } catch {
        if (mounted) setError("Error de red al cargar auditoría");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
          <ClipboardList size={14} className="text-slate-400" />
          Auditoría de acciones
        </p>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      {loading && logs.length === 0 ? (
        <p className="flex items-center gap-2 py-10 text-center text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" /> Cargando auditoría…
        </p>
      ) : logs.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          Sin registros de auditoría todavía.
        </p>
      ) : (
        <ul className="mt-3 max-h-[30rem] space-y-2 overflow-y-auto pr-1">
          {logs.map((log) => {
            const label =
              ACTION_LABELS[log.action] ??
              log.action.replace(/_/g, " ");
            const color = ACTION_COLORS[log.action] ?? "bg-slate-100 text-slate-600";
            return (
              <li
                key={log.id}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${color}`}
                >
                  {log.action.startsWith("user") ? (
                    <ShieldCheck size={14} />
                  ) : (
                    <ClipboardList size={14} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    <span className="font-bold text-slate-800">{log.actorName}</span>
                    <span className="rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {label}
                    </span>
                    <span className="ml-auto text-[11px] text-slate-400">
                      {formatDate(log.createdAt)}
                    </span>
                  </p>
                  {log.detail && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                      {log.detail}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}