import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSession } from "@/lib/auth";
import { REACTION_EMOJIS } from "@/lib/types";
import { broadcastEvent } from "@/lib/events";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rl = rateLimit(request, 40, "react");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Demasiadas peticiones. Intenta en ${rl.retryAfter}s.` },
        { status: 429 },
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para reaccionar" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = (await request.json()) as { emoji?: string; delta?: number };
    const emoji = body.emoji ?? "";
    if (!REACTION_EMOJIS.includes(emoji as never)) {
      return NextResponse.json({ error: "Reacción no válida" }, { status: 400 });
    }
    const delta = body.delta === -1 ? -1 : 1;

    const updated = await getStore().reactReport(id, emoji, delta);
    if (!updated) {
      return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
    }

    broadcastEvent("report.updated", updated);
    return NextResponse.json({ report: updated });
  } catch (err) {
    console.error("POST react", err);
    return NextResponse.json({ error: "Error al reaccionar" }, { status: 500 });
  }
}