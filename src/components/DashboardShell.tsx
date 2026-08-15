"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Report,
  Role,
  ROLE_LABELS,
  GRAVITY_LEVELS,
  GRAVITY_META,
  CATEGORY_LABELS,
  TYPE_LABELS,
} from "@/lib/types";
import { useRealtimeReports } from "@/hooks/useRealtimeReports";
import {
  ShieldAlert,
  Activity,
  CheckCircle2,
  Loader2,
  Map as MapIcon,
  LayoutList,
  Siren,
  Trash2,
  AlertTriangle,
  X,
  UserCheck,
  Save,
  User,
  ClipboardCheck,
  ShieldCheck,
  Users,
  ClipboardList,
  Download,
} from "lucide-react";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center text-sm text-slate-400">
      Cargando mapa…
    </div>
  ),
});

const UsersPanel = dynamic(() => import("@/components/UsersPanel"), {
  ssr: false,
  loading: () => (
    <div className="py-10 text-center text-sm text-slate-400">Cargando usuarios…</div>
  ),
});

const AuditPanel = dynamic(() => import("@/components/AuditPanel"), {
  ssr: false,
  loading: () => (
    <div className="py-10 text-center text-sm text-slate-400">Cargando auditoría…</div>
  ),
});

const STATUS_ORDER = ["activo", "en_proceso", "resuelto"] as const;
export default function DashboardShell({
  initialReports,
  actor,
}: {
  initialReports: Report[];
  actor: { name: string; role: string };
}) {
  const { reports, setReports } = useRealtimeReports(initialReports);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [view, setView] = useState<"list" | "map" | "users" | "audit">("list");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { assignedTo: string; solution: string }>
  >({});
  const [staff, setStaff] = useState<
    { id: string; name: string; role: Role }[]
  >([]);

  useEffect(() => {
    let mounted = true;
    async function fetchStaff() {
      try {
        const res = await fetch("/api/users/staff");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error");
        if (mounted) setStaff(data.staff ?? []);
      } catch {
        // si falla, el select quedará vacío sin bloquear el panel
      }
    }
    fetchStaff();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === "todos") return reports;
    return reports.filter((r) => (r.status ?? "activo") === statusFilter);
  }, [reports, statusFilter]);

  const kpis = useMemo(() => {
    const active = reports.filter((r) => (r.status ?? "activo") === "activo");
    const enProceso = reports.filter((r) => r.status === "en_proceso");
    const resolved = reports.filter((r) => r.status === "resuelto");
    const critical = reports.filter(
      (r) => r.gravity === "critica" && (r.status ?? "activo") !== "resuelto",
    );
    const byCat = CATEGORY_LABELS;
    const catCount = reports.reduce<Record<string, number>>((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + 1;
      return acc;
    }, {});
    return { active, enProceso, resolved, critical, byCat, catCount };
  }, [reports]);

  async function patch(id: string, body: Record<string, string | boolean>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setReports((prev) =>
        prev.map((r) => (r.id === id ? data.report : r)),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setBusyId(null);
    }
  }

  function confirmRemove(id: string, title: string) {
    setPendingDelete({ id, title });
  }

  function toggleManagement(report: Report) {
    if (openId === report.id) {
      setOpenId(null);
      return;
    }
    setOpenId(report.id);
    setDrafts((prev) => ({
      ...prev,
      [report.id]: {
        assignedTo: prev[report.id]?.assignedTo ?? report.assignedTo ?? "",
        solution: prev[report.id]?.solution ?? report.solution ?? "",
      },
    }));
  }

  function setDraft(id: string, key: "assignedTo" | "solution", value: string) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { assignedTo: "", solution: "" }), [key]: value },
    }));
  }

  async function saveManagement(report: Report) {
    const draft = drafts[report.id];
    if (!draft) return;
    const body: Record<string, string> = {
      solution: draft.solution,
      assignedTo: draft.assignedTo,
    };
    if (!report.assignedTo && draft.assignedTo) {
      body.assignedTo = draft.assignedTo;
    }
    await patch(report.id, body);
  }

  async function remove(id: string) {
    if (!pendingDelete) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error");
      setReports((prev) => prev.filter((r) => r.id !== id));
      setPendingDelete(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
            <ShieldAlert size={22} className="text-red-600" />
            Control de mando
          </h1>
          <p className="text-xs text-slate-500">
            {actor.name} · rol {actor.role}
          </p>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              view === "list" ? "bg-white shadow text-slate-900" : "text-slate-500"
            }`}
          >
            <LayoutList size={14} /> Incidentes
          </button>
          <button
            onClick={() => setView("map")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              view === "map" ? "bg-white shadow text-slate-900" : "text-slate-500"
            }`}
          >
            <MapIcon size={14} /> Mapa
          </button>
          {actor.role === "admin" && (
            <button
              onClick={() => setView("users")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                view === "users" ? "bg-white shadow text-slate-900" : "text-slate-500"
              }`}
            >
              <Users size={14} /> Usuarios
            </button>
          )}
          {actor.role === "admin" && (
            <button
              onClick={() => setView("audit")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                view === "audit" ? "bg-white shadow text-slate-900" : "text-slate-500"
              }`}
            >
              <ClipboardList size={14} /> Auditoría
            </button>
          )}
        </div>

        <button
          onClick={() => window.open("/api/reports/export", "_blank")}
          className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          title="Descargar todos los reportes en CSV"
        >
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          label="Críticos"
          value={kpis.critical.length}
          color="text-red-600"
          bg="bg-red-50 ring-red-100"
          icon={<Siren size={18} />}
        />
        <Kpi
          label="Activos"
          value={kpis.active.length}
          color="text-blue-600"
          bg="bg-blue-50 ring-blue-100"
          icon={<Activity size={18} />}
        />
        <Kpi
          label="En proceso"
          value={kpis.enProceso.length}
          color="text-amber-600"
          bg="bg-amber-50 ring-amber-100"
          icon={<Loader2 size={18} />}
        />
        <Kpi
          label="Resueltos"
          value={kpis.resolved.length}
          color="text-emerald-600"
          bg="bg-emerald-50 ring-emerald-100"
          icon={<CheckCircle2 size={18} />}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {(["todos", ...STATUS_ORDER] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
              statusFilter === s
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {s === "todos" ? "Todos" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Incidentes por canal
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(kpis.catCount).map(([cat, n]) => (
            <span
              key={cat}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
            >
              {kpis.byCat[cat as keyof typeof kpis.byCat]} · {n}
            </span>
          ))}
        </div>
      </div>

      {view === "users" && actor.role === "admin" ? (
        <UsersPanel />
      ) : view === "audit" && actor.role === "admin" ? (
        <AuditPanel />
      ) : view === "map" ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <div className="h-[28rem]">
            <MapView reports={filtered} />
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {filtered.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
              Sin incidentes en este estado.
            </p>
          )}
          {filtered.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                      style={{ background: GRAVITY_META[r.gravity].color }}
                    >
                      {GRAVITY_META[r.gravity].label}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                      {(r.status ?? "activo").replace("_", " ")}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                      {CATEGORY_LABELS[r.category]} · {TYPE_LABELS[r.type]}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleManagement(r)}
                    title="Abrir sesión de gestión"
                    className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                      openId === r.id
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <UserCheck size={14} /> Gestión
                  </button>
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900">
                  {r.title}
                </h3>
                {r.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                    {r.description}
                  </p>
                )}
                {r.assignedTo && (
                  <p className="mt-1 text-[11px] text-blue-600">
                    Asignado: {r.assignedTo}
                  </p>
                )}
              </div>

              {openId === r.id && (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <UserCheck size={14} className="text-blue-500" />
                      Sesión de gestión
                    </p>
                    <button
                      onClick={() => setOpenId(null)}
                      className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-slate-600"
                      aria-label="Cerrar gestión"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                        Estado del incidente
                      </label>
                      <select
                        value={r.status ?? "activo"}
                        disabled={busyId === r.id}
                        onChange={(e) => {
                          const value = e.target.value as Report["status"];
                          const body: Record<string, string | boolean> = {
                            status: value ?? "activo",
                          };
                          if (value === "en_proceso" && !r.assignedTo) {
                            body.assignedTo = actor.name;
                          }
                          patch(r.id, body);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-60"
                      >
                        <option value="activo">Activo</option>
                        <option value="en_proceso">Tomar / en proceso</option>
                        <option value="resuelto">Resolver</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                        Gravedad (validación del experto)
                      </label>
                      <select
                        value={r.gravity}
                        disabled={busyId === r.id}
                        onChange={(e) =>
                          patch(r.id, { gravity: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-60"
                      >
                        {GRAVITY_LEVELS.map((g) => (
                          <option key={g} value={g}>
                            {GRAVITY_META[g].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                        ¿Quién está gestionando este incidente?
                      </label>
                      <select
                        value={drafts[r.id]?.assignedTo ?? ""}
                        onChange={(e) =>
                          setDraft(r.id, "assignedTo", e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="">— Sin asignar —</option>
                        {(() => {
                          const current = drafts[r.id]?.assignedTo ?? "";
                          const known = staff.some((u) => u.name === current);
                          return current && !known ? (
                            <option value={current}>{current}</option>
                          ) : null;
                        })()}
                        {staff.map((u) => (
                          <option key={u.id} value={u.name}>
                            {u.name} · {ROLE_LABELS[u.role]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                        Solución o detalle de la gestión
                      </label>
                      <textarea
                        value={drafts[r.id]?.solution ?? ""}
                        onChange={(e) =>
                          setDraft(r.id, "solution", e.target.value)
                        }
                        placeholder="Describe qué solución se aplicó o en qué estado va la atención…"
                        rows={3}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                      <ActionBtn
                        disabled={busyId === r.id}
                        onClick={() => patch(r.id, { verified: !r.verified })}
                        className={
                          r.verified
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                        }
                        title={
                          r.verified
                            ? `Verificado por ${r.verifiedBy ?? "coordinación"}`
                            : "Marcar como verificado (combate bulos)"
                        }
                      >
                        <ShieldCheck size={14} /> {r.verified ? "Verificado ✓" : "Verificar"}
                      </ActionBtn>
                      <ActionBtn
                        disabled={busyId === r.id}
                        onClick={() => confirmRemove(r.id, r.title)}
                        className="bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600"
                        title="Eliminar reporte (información no verificada)"
                      >
                        <Trash2 size={14} /> Eliminar
                      </ActionBtn>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => saveManagement(r)}
                        disabled={busyId === r.id}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                      >
                        {busyId === r.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        Guardar gestión
                      </button>

                      <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                        {r.assignedTo && (
                          <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-blue-600">
                            <User size={12} /> {r.assignedTo}
                          </span>
                        )}
                        {r.status === "resuelto" && r.resolvedBy && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-600">
                            <CheckCircle2 size={12} /> Resuelto por {r.resolvedBy}
                            {r.resolvedAt &&
                              ` · ${formatDateTime(r.resolvedAt)}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {r.solution && (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                        <p className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <ClipboardCheck size={13} /> Solución registrada
                        </p>
                        <p className="mt-1 text-sm text-emerald-900">
                          {r.solution}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertTriangle size={22} />
              </span>
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 pt-3">
              <h3 className="text-base font-bold text-slate-900">
                Eliminar reporte
              </h3>
              <p className="mt-1.5 text-sm text-slate-500">
                Vas a eliminar permanentemente:
              </p>
              <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                “{pendingDelete.title}”
              </p>
              <p className="mt-3 text-xs text-slate-400">
                Esta acción registra la eliminación en la auditoría y no se puede
                deshacer.
              </p>
            </div>
            <div className="mt-5 flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                onClick={() => setPendingDelete(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => remove(pendingDelete.id)}
                disabled={busyId === pendingDelete.id}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 disabled:opacity-60"
              >
                {busyId === pendingDelete.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                {busyId === pendingDelete.id ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Kpi({
  label,
  value,
  color,
  bg,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ring-inset ${bg}`}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${color} bg-white shadow-sm`}>
        {icon}
      </div>
      <p className={`mt-2 text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  className,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}