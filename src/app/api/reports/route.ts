import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSession } from "@/lib/auth";
import { ReportInput } from "@/lib/types";
import { broadcastEvent } from "@/lib/events";
import { rateLimit } from "@/lib/rateLimit";
import { sendPushToSubscriptions } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = params.get("lat");
  const lng = params.get("lng");
  const radius = params.get("radius");
  const filter = {
    category: params.get("category") ?? undefined,
    gravity: params.get("gravity") ?? undefined,
    status: params.get("status") ?? undefined,
    q: params.get("q") ?? undefined,
    createdBy: params.get("createdBy") ?? undefined,
    lat: lat ? Number(lat) : undefined,
    lng: lng ? Number(lng) : undefined,
    radius: radius ? Number(radius) : undefined,
  };
  const page = Number(params.get("page") ?? "1");
  const limit = Number(params.get("limit") ?? "20");
  const result = await getStore().listReports(filter, {
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 20,
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimit(request, 15, "reports");
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Demasiados reportes. Intenta de nuevo en ${rl.retryAfter}s.`,
        },
        { status: 429 },
      );
    }

    const body = (await request.json()) as Partial<ReportInput>;

    const lat = Number(body.lat);
    const lng = Number(body.lng);

    if (
      !body.title?.trim() ||
      !body.description?.trim() ||
      !body.type ||
      !body.category ||
      !body.gravity
    ) {
      return NextResponse.json(
        { error: "Campos obligatorios incompletos" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "Se requiere una ubicación válida" },
        { status: 400 },
      );
    }

    const session = await getSession();
    if (session && session.role !== "admin" && session.role !== "coordinador") {
      const me = await getStore().findUserByIdentifier(session.phone);
      if (me && me.status !== "activo") {
        return NextResponse.json(
          { error: "Tu cuenta está pendiente de aprobación." },
          { status: 403 },
        );
      }
    }

    const image = body.image ?? "";
    if (image && image.length > 600_000) {
      return NextResponse.json(
        { error: "La imagen supera el tamaño máximo (600 KB)" },
        { status: 400 },
      );
    }

    const report = await getStore().createReport({
      title: body.title.trim(),
      type: body.type,
      category: body.category,
      gravity: body.gravity,
      description: body.description.trim(),
      lat,
      lng,
      address: body.address?.trim() ?? "",
      city: body.city?.trim() ?? "",
      contactPhone: body.contactPhone?.trim() ?? "",
      status: "activo",
      createdBy: session?.id ?? "",
      createdByName: session?.name ?? "",
      image: image || undefined,
    });

    broadcastEvent("report.created", report);

    if (report.gravity === "critica") {
      const users = await getStore().listUsers();
      const subs = users.flatMap((u) => u.pushSubscriptions ?? []);
      if (subs.length > 0) {
        const sent = await sendPushToSubscriptions(subs, {
          title: `Alerta crítica · ${process.env.NEXT_PUBLIC_APP_NAME || "Red de emergencias"}`,
          body: report.title,
          url: "/",
          critical: true,
        });
        if (sent > 0) {
          console.log(`Push: ${sent} notificaciones enviadas (reporte crítico)`);
        }
      }
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    console.error("POST /api/reports", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}