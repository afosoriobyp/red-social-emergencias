import { NextRequest } from "next/server";
import { getStore } from "@/lib/store";
import { getSession, authorize } from "@/lib/auth";
import { Report, CATEGORY_LABELS, TYPE_LABELS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(reports: Report[]): string {
  const header = [
    "id",
    "titulo",
    "tipo",
    "canal",
    "gravedad",
    "estado",
    "descripcion",
    "direccion",
    "lat",
    "lng",
    "contacto",
    "reportado_por",
    "apoyos",
    "verificado",
    "creado",
    "resuelto",
    "solucion",
    "asignado",
  ].join(",");

  const rows = reports.map((r) =>
    [
      r.id,
      r.title,
      TYPE_LABELS[r.type],
      CATEGORY_LABELS[r.category],
      r.gravity,
      r.status ?? "activo",
      r.description,
      r.address,
      r.lat,
      r.lng,
      r.contactPhone,
      r.createdByName,
      r.upvotes,
      r.verified ? "si" : "no",
      r.createdAt.toISOString(),
      r.resolvedAt ? r.resolvedAt.toISOString() : "",
      r.solution,
      r.assignedTo,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header, ...rows].join("\n");
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!authorize(session, ["admin", "coordinador"])) {
      return new Response("No autorizado", { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const { reports } = await getStore().listReports({
      category: params.get("category") ?? undefined,
      gravity: params.get("gravity") ?? undefined,
      status: params.get("status") ?? undefined,
      q: params.get("q") ?? undefined,
      city: process.env.NEXT_PUBLIC_CITY || "Roldanillo",
    });

    const csv = toCsv(reports);
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reportes-emergencias-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/reports/export", err);
    return new Response("Error al exportar", { status: 500 });
  }
}