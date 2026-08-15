import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = (await request.json()) as { endpoint?: string };
    if (!body.endpoint) {
      return NextResponse.json({ error: "Falta endpoint" }, { status: 400 });
    }

    await getStore().removePushSubscription(session.id, body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/push/unsubscribe", err);
    return NextResponse.json({ error: "Error al cancelar suscripción" }, { status: 500 });
  }
}