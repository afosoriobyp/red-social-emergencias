"use client";

import { useState } from "react";
import {
  Report,
  User,
  GRAVITY_META,
  GRAVITY_LEVELS,
  TYPE_LABELS,
  CATEGORY_LABELS,
  ROLE_LABELS,
  USER_STATUS_LABELS,
} from "@/lib/types";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Siren,
  Trash2,
  X,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  activo: "Activo",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
};

function formatAgo(date: Date): string {
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

const GRAVITY_ORDER: typeof GRAVITY_LEVELS = [
  "critica",
  "alta",
  "media",
  "baja",
];

function normalize(report: Report): Report {
  return {
    ...report,
    createdAt: new Date(report.createdAt),
    resolvedAt: report.resolvedAt ? new Date(report.resolvedAt) : undefined,
    verifiedAt: report.verifiedAt ? new Date(report.verifiedAt) : undefined,
  };
}

export default function ProfileShell({
  user,
  reports,
}: {
  user: User;
  reports: Report[];
}) {
  const [rows, setRows] = useState<Report[]>(reports.map(normalize));
  const [editing, setEditing] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const total = rows.length;
  const active = rows.filter((r) => (r.status ?? "activo") === "activo").length;
  const inProgress = rows.filter((r) => r.status === "en_proceso").length;
  const resolved = rows.filter((r) => r.status === "resuelto").length;
  const reactions = rows.reduce(
    (acc, r) => acc + Object.values(r.reactions ?? {}).reduce((a, b) => a + b, 0),
    0,
  );

  async function handleSave(updated: Report) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/reports/${updated.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: updated.title,
          description: updated.description,
          address: updated.address,
          contactPhone: updated.contactPhone,
          gravity: updated.gravity,
        }),
      });
      const data = (await res.json()) as { report?: Report; error?: string };
      if (!res.ok || !data.report) {
        setError(data.error ?? "Error al guardar cambios");
        return;
      }
      const n = normalize(data.report);
      setRows((prev) => prev.map((r) => (r.id === n.id ? n : r)));
      setEditing(null);
    } catch {
      setError("Error de red al guardar");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/reports/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Error al eliminar");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== deleting.id));
      setDeleting(null);
    } catch {
      setError("Error de red al eliminar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-28 lg:pb-8">
      <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3.5">
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white ${
              user.role === "admin"
                ? "bg-gradient-to-br from-red-500 to-red-700"
                : user.role === "coordinador"
                  ? "bg-gradient-to-br from-orange-500 to-amber-600"
                  : "bg-gradient-to-br from-slate-500 to-slate-700"
            }`}
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="truncate text-lg font-bold text-slate-900">
                {user.name}
              </h1>
              {user.role === "admin" && (
                <ShieldCheck size={15} className="text-red-500" />
              )}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {ROLE_LABELS[user.role]}
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                {USER_STATUS_LABELS[user.status]}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Phone size={11} /> {user.phone}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays size={11} /> Miembro desde{" "}
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { label: "Reportes", value: total },
            { label: "Activos", value: active },
            { label: "En proceso", value: inProgress },
            { label: "Resueltos", value: resolved },
            { label: "Reacciones", value: reactions },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl bg-slate-50 px-3 py-2.5 text-center"
            >
              <p className="text-lg font-bold text-slate-800">{s.value}</p>
              <p className="text-[11px] font-medium text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      <PasswordCard />

      <h2 className="mt-6 mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
        Mis reportes
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-14 text-center">
            <MapPin size={26} className="text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-500">
              Aún no has publicado reportes
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Crea el primer reporte desde la portada.
            </p>
          </div>
        )}

        {rows.map((r) => {
          const meta = GRAVITY_META[r.gravity];
          return (
            <article
              key={r.id}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: meta.color }}
                  title={`Gravedad ${meta.label}`}
                >
                  {r.gravity === "critica" ? (
                    <Siren size={15} />
                  ) : (
                    <MapPin size={15} />
                  )}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  {r.status === "resuelto" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                      <CheckCircle2 size={11} /> Resuelto
                    </span>
                  )}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {STATUS_LABELS[r.status ?? "activo"]}
                  </span>
                </div>
              </div>

              <h3 className="mt-2 text-sm font-bold leading-snug text-slate-900">
                {r.title}
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                {meta.label} · {TYPE_LABELS[r.type]} ·{" "}
                {CATEGORY_LABELS[r.category]}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                <Clock size={10} /> {formatAgo(r.createdAt)}
              </p>

              {r.image && (
                <div className="mt-2.5 overflow-hidden rounded-lg border border-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.image}
                    alt={`Foto de ${r.title}`}
                    className="max-h-40 w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => {
                    setError("");
                    setEditing(r);
                  }}
                  disabled={busy}
                  title="Editar reporte"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => {
                    setError("");
                    setDeleting(r);
                  }}
                  disabled={busy}
                  title="Eliminar reporte"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {editing && <EditModal report={editing} busy={busy} onClose={() => setEditing(null)} onSave={handleSave} />}

      {deleting && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-bold text-slate-900">
                ¿Eliminar reporte?
              </h3>
              <button
                onClick={() => setDeleting(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Se eliminará de forma permanente el reporte{" "}
              <span className="font-semibold text-slate-700">
                «{deleting.title}»
              </span>{" "}
              y su foto asociada.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setMessage("");
    setError("");
    if (!current || !next) {
      setError("Completa todos los campos");
      return;
    }
    if (next.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (next !== confirm) {
      setError("Las contraseñas nuevas no coinciden");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Error al cambiar la contraseña");
        return;
      }
      setMessage("Contraseña actualizada correctamente");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setError("Error de red al cambiar la contraseña");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <KeyRound size={14} className="text-slate-400" />
        Cambiar contraseña
      </p>

      {message && (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-slate-600">
            Contraseña actual
          </label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">
            Nueva contraseña
          </label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">
            Confirmar nueva
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <button
        onClick={submit}
        disabled={busy}
        className="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
      >
        {busy && <Loader2 size={13} className="animate-spin" />}
        Actualizar contraseña
      </button>
    </div>
  );
}

function EditModal({
  report,
  busy,
  onClose,
  onSave,
}: {
  report: Report;
  busy: boolean;
  onClose: () => void;
  onSave: (r: Report) => void;
}) {
  const [title, setTitle] = useState(report.title);
  const [description, setDescription] = useState(report.description);
  const [address, setAddress] = useState(report.address ?? "");
  const [contactPhone, setContactPhone] = useState(report.contactPhone ?? "");
  const [gravity, setGravity] = useState<Report["gravity"]>(report.gravity);

  function submit() {
    if (!title.trim() || !description.trim()) return;
    onSave({
      ...report,
      title: title.trim(),
      description: description.trim(),
      address: address.trim(),
      contactPhone: contactPhone.trim(),
      gravity,
    });
  }

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-bold text-slate-900">Editar reporte</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Título
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Dirección
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Contacto
              </label>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">
              Gravedad
            </label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {GRAVITY_ORDER.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGravity(g)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    gravity === g
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {GRAVITY_META[g].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={busy || !title.trim() || !description.trim()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}