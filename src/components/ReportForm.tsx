"use client";

import { useState } from "react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  EMERGENCY_TYPES,
  TYPE_LABELS,
  GRAVITY_LEVELS,
  GRAVITY_META,
  ReportInput,
  Report,
} from "@/lib/types";
import { Siren, MapPin, Send, X, Loader2, Navigation, Sparkles, Camera, Image as ImageIcon } from "lucide-react";
import { getAddressFromCoords } from "@/lib/geo";
import { enqueueAction, isOnline } from "@/lib/idb";

const GRAVITY_ORDER: typeof GRAVITY_LEVELS = [
  "critica",
  "alta",
  "media",
  "baja",
];

const CATEGORY_ICON: Record<string, string> = {
  reporte: "🚨",
  donaciones: "🎁",
  acopio: "📦",
  voluntarios: "🤝",
  medico: "🏥",
  albergues: "🏠",
  noti: "📢",
};

const CITIES = [
  { name: "Roldanillo", lat: 4.4126, lng: -76.1546 },
  { name: "Dosquebradas", lat: 4.8367, lng: -75.6744 },
  { name: "Versalles", lat: 4.5758, lng: -76.2009 },
];

function detectCity(lat: number, lng: number): string {
  let best = "";
  let bestDist = Infinity;
  for (const c of CITIES) {
    const dLat = c.lat - lat;
    const dLng = c.lng - lng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < bestDist) {
      bestDist = dist;
      best = c.name;
    }
  }
  return bestDist < 0.25 ? best : "";
}

export default function ReportForm({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: (report: Report) => void;
}) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [locating, setLocating] = useState(false);

  const [form, setForm] = useState({
    category: "reporte" as ReportInput["category"],
    type: "accidente" as ReportInput["type"],
    gravity: "media" as ReportInput["gravity"],
    title: "",
    description: "",
    lat: 0 as number,
    lng: 0 as number,
    address: "",
    city: process.env.NEXT_PUBLIC_CITY || "",
    contactPhone: "",
    image: "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const steps = [
    { label: "Qué pasó" },
    { label: "Dónde" },
    { label: "Detalle" },
  ];

  async function handleGetLocation() {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización");
      return;
    }
    setLocating(true);
    setError("");
    setUseMyLocation(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        set("lat", lat);
        set("lng", lng);
        set("address", await getAddressFromCoords(lat, lng));
        const detected = detectCity(lat, lng);
        if (detected) set("city", detected);
        setUseMyLocation(true);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setUseMyLocation(false);
        setError("No se pudo obtener tu ubicación. Marca el punto en el mapa.");
      },
      { timeout: 10000 },
    );
  }

  function compressImage(file: File, maxSize = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagen inválida"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Error al procesar imagen"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const dataUrl = await compressImage(file);
    if (dataUrl.length > 600_000) {
      setError("La foto es muy pesada. Prueba con una más pequeña.");
      return;
    }
    set("image", dataUrl);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Error con la imagen");
  }
}

async function handleSubmit() {
    setError("");
    if (!form.title.trim() || !form.description.trim()) {
      setError("Completa el título y la descripción.");
      return;
    }
    if (!form.lat || !form.lng) {
      setError("Define la ubicación del reporte.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al publicar");
      }
      const data = await res.json();
      onSubmitted(data.report as Report);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al publicar";
      setError(msg);
      setSubmitting(false);
      if (!isOnline()) {
        try {
          await enqueueAction("createReport", form);
        } catch {
          /* si falla IndexedDB, mantener error original */
        }
      }
    }
  }

  function next() {
    setError("");
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500">
                <Siren size={18} />
              </span>
              Reportar emergencia
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {steps[step].label} · paso {step + 1} de {steps.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-1.5 px-5 pt-4">
          {steps.map((s, i) => (
            <div
              key={s.label}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-red-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {error && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600">
              {error}
            </p>
          )}

          {step === 0 && (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Canal
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => set("category", c)}
                      className={`rounded-xl border px-3 py-2.5 text-center text-sm transition ${
                        form.category === c
                          ? "border-red-500 bg-red-50 font-semibold text-red-600"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <span className="mr-1">{CATEGORY_ICON[c]}</span>
                      {CATEGORY_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Tipo de emergencia
                </p>
                <div className="flex flex-wrap gap-2">
                  {EMERGENCY_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => set("type", t)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        form.type === t
                          ? "border-red-500 bg-red-500 text-white"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Gravedad
                </p>
                <div className="space-y-2">
                  {GRAVITY_ORDER.map((g) => (
                    <button
                      key={g}
                      onClick={() => set("gravity", g)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
                        form.gravity === g
                          ? "ring-2 ring-offset-1"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      style={
                        form.gravity === g
                          ? { borderColor: GRAVITY_META[g].color, ["--tw-ring-color" as string]: GRAVITY_META[g].color }
                          : undefined
                      }
                    >
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full"
                        style={{ background: GRAVITY_META[g].color }}
                      />
                      <span className="text-sm font-medium text-gray-800">
                        {GRAVITY_META[g].label}
                      </span>
                      <span className="ml-auto text-[11px] text-gray-400">
                        {g === "critica"
                          ? "Vidas en peligro · alerta inmediata"
                          : g === "alta"
                            ? "Afectación considerable"
                            : g === "media"
                              ? "Requiere apoyo"
                              : "Bajo riesgo"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <button
                onClick={handleGetLocation}
                disabled={locating}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60"
              >
                {locating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Navigation size={18} />
                )}
                {locating
                  ? "Obteniendo ubicación…"
                  : useMyLocation
                    ? "Usar mi ubicación (✓)"
                    : "Usar mi ubicación actual"}
              </button>

              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span className="h-px flex-1 bg-gray-200" /> O <span className="h-px flex-1 bg-gray-200" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Ciudad / municipio
                </label>
                <select
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Selecciona la ciudad…</option>
                  {CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-gray-400">
                  <Navigation size={12} className="mt-0.5 shrink-0" />
                  Se detecta automáticamente con tu ubicación. Ajústala si es necesario.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Coordenadas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={form.lat ? String(Math.round(form.lat * 1e5) / 1e5) : ""}
                    onChange={(e) => {
                      set("lat", parseFloat(e.target.value) || 0);
                      setUseMyLocation(false);
                    }}
                    placeholder="Latitud"
                    inputMode="decimal"
                    className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                  <input
                    value={form.lng ? String(Math.round(form.lng * 1e5) / 1e5) : ""}
                    onChange={(e) => {
                      set("lng", parseFloat(e.target.value) || 0);
                      setUseMyLocation(false);
                    }}
                    placeholder="Longitud"
                    inputMode="decimal"
                    className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-[11px] text-gray-400">
                  <MapPin size={12} className="mt-0.5 shrink-0" />
                  Puedes pegar las coordenadas o usar tu ubicación. Esto marca
                  el reporte en el mapa.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Referencia / zona
                </label>
                <input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Ej: Av. Principal, cerca del mercado"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Título *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Ej: Derrumbe bloquea vía principal"
                  maxLength={120}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Descripción *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Detalla qué está ocurriendo, cuántas personas están afectadas y qué se necesita…"
                  rows={4}
                  maxLength={1000}
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Foto del incidente (opcional)
                </label>
                {form.image ? (
                  <div className="relative overflow-hidden rounded-2xl border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.image}
                      alt="Vista previa del incidente"
                      className="max-h-56 w-full object-cover"
                    />
                    <button
                      onClick={() => set("image", "")}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
                      aria-label="Quitar foto"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500 transition hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600">
                    <Camera size={18} />
                    Agregar foto
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePickImage}
                    />
                  </label>
                )}
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-400">
                  <ImageIcon size={11} />
                  Se comprime automáticamente (máx. 600 KB).
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Teléfono / WhatsApp de contacto
                </label>
                <input
                  value={form.contactPhone}
                  onChange={(e) =>
                    set("contactPhone", e.target.value.replace(/[^\d+]/g, ""))
                  }
                  placeholder="Ej: 57XXXXXXXXX"
                  inputMode="tel"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
                <p className="mt-1.5 text-[11px] text-gray-400">
                  Se usa para generar enlaces de WhatsApp y coordinar ayuda.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-white"
              >
                Atrás
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                onClick={next}
                className="flex flex-1 items-center justify-center rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Continuar →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                {submitting ? "Publicando…" : "Publicar reporte"}
              </button>
            )}
          </div>
          <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-gray-400">
            <Sparkles size={11} />
            Los reportes críticos se priorizan en el mapa y se pueden difundir
            por WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}