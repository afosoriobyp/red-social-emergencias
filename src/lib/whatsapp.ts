import { Report, GRAVITY_META, TYPE_LABELS, CATEGORY_LABELS } from "./types";

function sanitizePhone(phone: string): string {
  const digits = (phone || "").replace(/[^\d]/g, "");
  return digits.startsWith("00") ? digits.slice(2) : digits;
}

export function buildWhatsAppLink(
  phone: string,
  report: Pick<
    Report,
    "title" | "gravity" | "type" | "category" | "lat" | "lng" | "description"
  >,
  group?: string,
): string {
  const digits = sanitizePhone(phone);
  if (!digits) return "";

  const mapUrl = `https://www.google.com/maps?q=${report.lat},${report.lng}`;
  const lines = [
    `🚨 REPORTE ${GRAVITY_META[report.gravity].label.toUpperCase()}`,
    `📌 ${TYPE_LABELS[report.type]} · ${CATEGORY_LABELS[report.category]}`,
    `📍 ${report.title}`,
    `📝 ${report.description}`,
    `🗺️ Ver ubicación: ${mapUrl}`,
  ];
  if (group) {
    lines.push(`\nCanal: ${group}`);
  }
  const message = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${digits}?text=${message}`;
}

export function buildAlertLink(phone: string, report: Pick<Report, "title" | "gravity" | "lat" | "lng">): string {
  const digits = sanitizePhone(phone);
  if (!digits) return "";
  const mapUrl = `https://www.google.com/maps?q=${report.lat},${report.lng}`;
  const message = encodeURIComponent(
    `⚠️ ALERTA ${GRAVITY_META[report.gravity].label.toUpperCase()} en zona: ${report.title}\n🗺️ ${mapUrl}`,
  );
  return `https://wa.me/${digits}?text=${message}`;
}