import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import {
  getSession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimit(request, 5, "change-password");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta en ${rl.retryAfter}s.` },
        { status: 429 },
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Debes iniciar sesión" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
    const currentPassword = body.currentPassword ?? "";
    const newPassword = body.newPassword ?? "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Debes indicar tu contraseña actual y la nueva" },
        { status: 400 },
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 6 caracteres" },
        { status: 400 },
      );
    }

    const user = await getStore().findUserByIdentifier(session.phone);
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "La contraseña actual no es correcta" },
        { status: 403 },
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await getStore().updatePassword(user.id, passwordHash);

    await getStore().logAudit({
      actorId: session.id,
      actorName: session.name,
      action: "auth.password_change",
      detail: "Contraseña actualizada por el propio usuario",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/change-password", err);
    return NextResponse.json({ error: "Error al cambiar contraseña" }, { status: 500 });
  }
}