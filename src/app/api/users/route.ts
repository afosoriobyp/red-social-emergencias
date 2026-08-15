import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSession, authorize, hashPassword } from "@/lib/auth";
import { ROLES, Role } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!authorize(session, ["admin"])) {
    return NextResponse.json(
      { error: "No autorizado: se requiere rol de administrador" },
      { status: 403 },
    );
  }
  const users = await getStore().listUsers();
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!authorize(session, ["admin"])) {
      return NextResponse.json(
        { error: "No autorizado: se requiere rol de administrador" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      password?: string;
      role?: string;
    };
    const name = body.name?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    const password = body.password ?? "";
    const role = (body.role as Role) ?? "usuario";

    if (!name || !phone || password.length < 6) {
      return NextResponse.json(
        { error: "Nombre, teléfono y contraseña (mín. 6) son obligatorios" },
        { status: 400 },
      );
    }
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const existing = await getStore().findUserByIdentifier(phone);
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese teléfono" },
        { status: 409 },
      );
    }

    const hash = await hashPassword(password);
    const user = await getStore().createUser({ name, phone, passwordHash: hash, role });

    await getStore().logAudit({
      actorId: session!.id,
      actorName: session!.name,
      action: "user.create",
      entityId: user.id,
      detail: `Creado ${role}: ${name} (${phone})`,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("POST /api/users", err);
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}