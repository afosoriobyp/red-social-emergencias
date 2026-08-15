import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSession, authorize } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!authorize(session, ["admin"])) {
      return NextResponse.json(
        { error: "No autorizado: se requiere rol de administrador" },
        { status: 403 },
      );
    }

    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 100);
    const logs = await getStore().listAudit(Math.min(Math.max(limit, 1), 500));

    return NextResponse.json({ logs });
  } catch (err) {
    console.error("GET /api/audit", err);
    return NextResponse.json({ error: "Error al cargar auditoría" }, { status: 500 });
  }
}