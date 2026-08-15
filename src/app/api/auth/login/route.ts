import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import {
  verifyPassword,
  createSession,
  setSessionCookie,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimit(request, 10, "login");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${rl.retryAfter}s.` },
        { status: 429 },
      );
    }

    const body = (await request.json()) as { identifier?: string; password?: string };
    const identifier = body.identifier?.trim() ?? "";
    const password = body.password ?? "";

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Teléfono y contraseña son obligatorios" },
        { status: 400 },
      );
    }

    const user = await getStore().findUserByIdentifier(identifier);
    if (!user) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (user.status === "bloqueado") {
      return NextResponse.json(
        { error: "Tu cuenta ha sido bloqueada." },
        { status: 403 },
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const session = {
      id: user.id,
      name: user.name,
      role: user.role,
      status: user.status,
      phone: user.phone,
    };
    const token = await createSession(session);
    await setSessionCookie(token);

    return NextResponse.json({ user: session });
  } catch (err) {
    console.error("POST /api/auth/login", err);
    return NextResponse.json({ error: "Error al iniciar sesión" }, { status: 500 });
  }
}