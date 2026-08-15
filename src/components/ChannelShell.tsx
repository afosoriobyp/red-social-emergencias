"use client";

import { useMemo, useState } from "react";
import { Report, CATEGORIES, CATEGORY_LABELS, GRAVITY_META, GRAVITY_LEVELS } from "@/lib/types";
import { useRealtimeReports } from "@/hooks/useRealtimeReports";
import { useCriticalAlert } from "@/hooks/useCriticalAlert";
import ReportCard from "@/components/ReportCard";
import {
  Search,
  ChevronDown,
  ShieldAlert,
  Activity,
  CheckCircle2,
  Loader2,
  Siren,
  MapPin,
  X,
  Bell,
} from "lucide-react";

const GRAVITY_ORDER: typeof GRAVITY_LEVELS = [
  "critica",
  "alta",
  "media",
  "baja",
];

const NEARBY_KM = 25;

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const STATUS_FILTERS = [
  { key: "activo", label: "Activos", icon: Activity, color: "text-blue-500" },
  { key: "en_proceso", label: "En proceso", icon: Loader2, color: "text-amber-500" },
  { key: "resuelto", label: "Resueltos", icon: CheckCircle2, color: "text-emerald-500" },
  { key: "todos", label: "Todos", icon: Bell, color: "text-slate-400" },
];

const OTHER_CHANNELS = CATEGORIES.filter((c) => c !== "reporte");

export default function ChannelShell({
  canal,
  initialReports,
  initialTotal,
  initialCommentCounts,
}: {
  canal: (typeof CATEGORIES)[number];
  initialReports: Report[];
  initialTotal?: number;
  initialCommentCounts?: Record<string, number>;
}) {
  const [statusFilter, setStatusFilter] = useState("activo");
  const [gravity, setGravity] = useState("todas");
  const [query, setQuery] = useState("");
  const [nearby, setNearby] = useState(false);
  const [nearbyLat, setNearbyLat] = useState(0);
  const [nearbyLng, setNearbyLng] = useState(0);
  const [locatingNearby, setLocatingNearby] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(
    initialTotal !== undefined ? initialTotal > initialReports.length : true,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const { reports, setReports, commentCounts, setCommentCounts } =
    useRealtimeReports(initialReports, initialCommentCounts);
  const { alert: criticalAlert, dismiss: dismissAlert } =
    useCriticalAlert(reports);

  const filtered = useMemo(() => {
    let out = [...reports].sort(
      (a, b) =>
        (a.gravity === "critica" ? 3 : a.gravity === "alta" ? 2 : a.gravity === "media" ? 1 : 0) -
          (b.gravity === "critica" ? 3 : b.gravity === "alta" ? 2 : b.gravity === "media" ? 1 : 0) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (statusFilter !== "todos") {
      const target = statusFilter === "activo" ? "activo" : statusFilter;
      out = out.filter((r) => (r.status ?? "activo") === target);
    }
    if (gravity !== "todas") out = out.filter((r) => r.gravity === gravity);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      );
    }
    if (nearby) {
      out = out.filter(
        (r) => haversineKm(nearbyLat, nearbyLng, r.lat, r.lng) <= NEARBY_KM,
      );
    }
    return out;
  }, [reports, statusFilter, gravity, query, nearby, nearbyLat, nearbyLng]);

  const criticalCount = useMemo(
    () =>
      reports.filter(
        (r) => r.gravity === "critica" && (r.status ?? "activo") !== "resuelto",
      ).length,
    [reports],
  );

  function handleUpdateReport(updated: Report) {
    const normalized: Report = {
      ...updated,
      createdAt: new Date(updated.createdAt),
      resolvedAt: updated.resolvedAt ? new Date(updated.resolvedAt) : undefined,
      verifiedAt: updated.verifiedAt ? new Date(updated.verifiedAt) : undefined,
    };
    setReports((prev) =>
      prev.map((r) => (r.id === normalized.id ? normalized : r)),
    );
  }

  function handleCommentCount(id: string, count: number) {
    setCommentCounts((prev) => ({ ...prev, [id]: count }));
  }

  function toggleNearby() {
    if (nearby) {
      setNearby(false);
      return;
    }
    if (!navigator.geolocation) return;
    setLocatingNearby(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearbyLat(pos.coords.latitude);
        setNearbyLng(pos.coords.longitude);
        setNearby(true);
        setLocatingNearby(false);
      },
      () => setLocatingNearby(false),
      { timeout: 10000 },
    );
  }

  return (
    <main className="relative mx-auto w-full overflow-hidden pb-28 lg:pb-8">
      <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2 px-4 pt-3">
            <h1 className="flex-1 text-xl font-bold text-slate-900">
              {CATEGORY_LABELS[canal]}
            </h1>
            <div className="flex items-center gap-1.5">
              {OTHER_CHANNELS.map((c) => (
                <a
                  key={c}
                  href={`/canal/${c}`}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                >
                  {CATEGORY_LABELS[c]}
                </a>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 pt-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Buscar en ${CATEGORY_LABELS[canal].toLowerCase()}…`}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-slate-900"
              />
            </div>
            <div className="relative">
              <select
                value={gravity}
                onChange={(e) => setGravity(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-slate-900"
              >
                <option value="todas">Todas</option>
                {GRAVITY_ORDER.map((g) => (
                  <option key={g} value={g}>
                    {GRAVITY_META[g].label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto px-4 pb-1 pt-1 scrollbar-none">
            {STATUS_FILTERS.map((s) => {
              const isActive = statusFilter === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <s.icon
                    size={13}
                    className={isActive ? "text-red-400" : s.color}
                  />
                  {s.label}
                </button>
              );
            })}

            <button
              onClick={toggleNearby}
              disabled={locatingNearby}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 disabled:opacity-60 ${
                nearby
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
              title={`Mostrar solo reportes en un radio de ${NEARBY_KM} km de mi ubicación`}
            >
              {locatingNearby ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <MapPin size={13} className={nearby ? "text-white" : "text-blue-500"} />
              )}
              {nearby ? `Cerca de mí (${NEARBY_KM} km)` : "Cerca de mí"}
            </button>
          </div>

          {criticalCount > 0 && (
            <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5">
              <span className="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-xl bg-red-600 text-white">
                <ShieldAlert size={20} />
              </span>
              <div>
                <p className="text-sm font-bold text-red-700">
                  {criticalCount}{" "}
                  {criticalCount === 1
                    ? "incidente crítico"
                    : "incidentes críticos"}{" "}
                  activos
                </p>
                <p className="text-[11px] text-red-600/80">
                  Requieren atención inmediata
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2">
            {filtered.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                <Bell size={28} className="text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  No hay reportes en este filtro
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Cambia los filtros o crea el primer reporte.
                </p>
              </div>
            )}
            {filtered.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                onUpdateReport={handleUpdateReport}
                commentCount={commentCounts[r.id]}
                onCommentCount={handleCommentCount}
              />
            ))}
            {hasMore && (
              <div className="col-span-full">
                <button
                  onClick={async () => {
                    setLoadingMore(true);
                    try {
                      const nextPage = page + 1;
                      const res = await fetch(
                        `/api/reports?category=${canal}&page=${nextPage}&limit=20`,
                      );
                      const data = await res.json();
                      if (res.ok && data.reports?.length) {
                        setReports((prev) => [...prev, ...data.reports]);
                        setPage(nextPage);
                        setHasMore(data.hasMore);
                      } else {
                        setHasMore(false);
                      }
                    } finally {
                      setLoadingMore(false);
                    }
                  }}
                  disabled={loadingMore}
                  className="w-full mx-auto mt-4 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={16} className="mx-auto animate-spin" />
                    </>
                  ) : (
                    "Cargar más"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

      {criticalAlert && (
        <div className="fixed left-1/2 top-16 z-[1600] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 animate-pulse">
          <button
            onClick={dismissAlert}
            className="flex w-full items-center gap-3 rounded-2xl border border-red-300 bg-red-600 p-4 text-left text-white shadow-2xl shadow-red-600/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Siren size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold uppercase tracking-wide text-red-100">
                Nueva alerta crítica
              </span>
              <span className="block truncate text-sm font-semibold">
                {criticalAlert.title}
              </span>
            </span>
            <X size={16} className="shrink-0 text-red-100" />
          </button>
        </div>
      )}
    </main>
  );
}