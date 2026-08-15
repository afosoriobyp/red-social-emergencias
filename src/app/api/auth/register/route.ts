import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import {
  hashPassword,
  createSession,
  setSessionCookie,
  toSessionUser,
} from "@/lib/auth";
import { Role } from "@/lib/types";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimit(request, 10, "register");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${rl.retryAfter}s.` },
        { status: 429 },
      );
    }

    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      password?: string;
    };
    const name = body.name?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    const password = body.password ?? "";

    if (!name || !phone || password.length < 6) {
      return NextResponse.json(
        { error: "Nombre, teléfono y contraseña (mín. 6) son obligatorios" },
        { status: 400 },
      );
    }

    const existing = await getStore().findUserByIdentifier(phone);
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese teléfono" },
        { status: 409 },
      );
    }

    const adminPhones = (process.env.ADMIN_PHONES || "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const isAdmin = adminPhones.includes(phone);
    const role: Role = isAdmin ? "admin" : "usuario";

    const hash = await hashPassword(password);
    const user = await getStore().createUser({
      name,
      phone,
      passwordHash: hash,
      role,
      status: isAdmin ? "activo" : "pendiente",
    });
    const token = await createSession(toSessionUser(user));
    await setSessionCookie(token);

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("POST /api/auth/register", err);
    return NextResponse.json({ error: "Error al registrar" }, { status: 500 });
  }
}