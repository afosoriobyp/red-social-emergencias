import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSession, authorize, hashPassword } from "@/lib/auth";
import { ROLES, Role } from "@/lib/types";
import { broadcastEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!authorize(session, ["admin"])) {
      return NextResponse.json(
        { error: "No autorizado: se requiere rol de administrador" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = (await request.json()) as {
      role?: string;
      status?: "pendiente" | "activo" | "bloqueado";
      password?: string;
    };

    let updated = null;
    if (body.role) {
      if (!ROLES.includes(body.role as Role)) {
        return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
      }
      updated = await getStore().updateUserRole(id, body.role as Role);
      if (updated) {
        await getStore().logAudit({
          actorId: session!.id,
          actorName: session!.name,
          action: "user.role",
          entityId: id,
          detail: `Rol asignado: ${body.role} (${updated.name})`,
        });
      }
    }
    if (body.status) {
      if (!["pendiente", "activo", "bloqueado"].includes(body.status)) {
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
      }
      updated = await getStore().updateUserStatus(id, body.status);
      if (updated) {
        await getStore().logAudit({
          actorId: session!.id,
          actorName: session!.name,
          action: "user.status",
          entityId: id,
          detail: `Estado: ${body.status} (${updated.name})`,
        });
      }
    }
    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json(
          { error: "La contraseña debe tener al menos 6 caracteres" },
          { status: 400 },
        );
      }
      const passwordHash = await hashPassword(body.password);
      updated = await getStore().updatePassword(id, passwordHash);
      if (updated) {
        await getStore().logAudit({
          actorId: session!.id,
          actorName: session!.name,
          action: "user.password_reset",
          entityId: id,
          detail: `Contraseña restablecida (${updated.name})`,
        });
      }
    }

    if (!updated) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("PATCH /api/users/[id]", err);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!authorize(session, ["admin"])) {
      return NextResponse.json(
        { error: "No autorizado: se requiere rol de administrador" },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (id === session!.id) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta" },
        { status: 400 },
      );
    }

    const target = (await getStore().listUsers()).find((u) => u.id === id);
    if (!target) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const deleted = await getStore().deleteUser(id);
    if (!deleted) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const removedReportIds = await getStore().deleteUserReports(id);
    for (const rid of removedReportIds) {
      broadcastEvent("report.deleted", { id: rid });
    }

    await getStore().logAudit({
      actorId: session!.id,
      actorName: session!.name,
      action: "user.delete",
      entityId: id,
      detail: `Eliminado: ${target.name} (${target.phone}) · ${removedReportIds.length} reportes`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/users/[id]", err);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}