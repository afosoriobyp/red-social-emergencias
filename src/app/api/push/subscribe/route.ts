import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSession } from "@/lib/auth";
import { publicVapidKey, pushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!pushConfigured()) {
    return NextResponse.json({ enabled: false, publicKey: "" });
  }
  return NextResponse.json({ enabled: true, publicKey: publicVapidKey() });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = (await request.json()) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json(
        { error: "Suscripción incompleta" },
        { status: 400 },
      );
    }

    const user = await getStore().addPushSubscription(session.id, {
      endpoint: body.endpoint,
      keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/push/subscribe", err);
    return NextResponse.json({ error: "Error al suscribir" }, { status: 500 });
  }
}