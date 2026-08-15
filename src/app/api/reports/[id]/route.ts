import { NextRequest, NextResponse } from "next/server";
import { getStore, ReportPatch } from "@/lib/store";
import { getSession, authorize } from "@/lib/auth";
import { GRAVITY_LEVELS, STATUS_LEVELS } from "@/lib/types";
import { broadcastEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    const { id } = await params;

    const existing = await getStore().getReport(id);
    if (!existing) {
      return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
    }

    const isManager = authorize(session, ["admin", "coordinador"]);
    const isAuthor = !!session && existing.createdBy === session.id;
    if (!isManager && !isAuthor) {
      return NextResponse.json(
        {
          error: "No autorizado: solo administradores o el autor del reporte pueden editarlo",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      title?: string;
      description?: string;
      address?: string;
      contactPhone?: string;
      gravity?: string;
      status?: string;
      assignedTo?: string;
      solution?: string;
      verified?: boolean;
    };

    const patch: ReportPatch = {};

    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json({ error: "El título no puede estar vacío" }, { status: 400 });
      }
      patch.title = title;
    }
    if (body.description !== undefined) {
      const description = body.description.trim();
      if (!description) {
        return NextResponse.json(
          { error: "La descripción no puede estar vacía" },
          { status: 400 },
        );
      }
      patch.description = description;
    }
    if (body.address !== undefined) patch.address = body.address.trim();
    if (body.contactPhone !== undefined) patch.contactPhone = body.contactPhone.trim();
    if (body.gravity) {
      if (!GRAVITY_LEVELS.includes(body.gravity as never)) {
        return NextResponse.json({ error: "Gravedad inválida" }, { status: 400 });
      }
      patch.gravity = body.gravity as ReportPatch["gravity"];
    }

    if (isManager) {
      if (body.status) {
        if (!STATUS_LEVELS.includes(body.status as never)) {
          return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
        }
        patch.status = body.status as ReportPatch["status"];
        patch.resolvedBy =
          patch.status === "resuelto" ? session!.name : undefined;
      }
      if (body.assignedTo !== undefined) {
        patch.assignedTo = body.assignedTo;
      }
      if (body.solution !== undefined) {
        patch.solution = body.solution;
      }
      if (body.verified !== undefined) {
        patch.verified = Boolean(body.verified);
        patch.verifiedBy = patch.verified ? session!.name : "";
        patch.verifiedAt = patch.verified ? new Date() : undefined;
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Sin cambios a aplicar" }, { status: 400 });
    }

    const updated = await getStore().updateReport(id, patch);
    if (!updated) {
      return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
    }

    await getStore().logAudit({
      actorId: session!.id,
      actorName: session!.name,
      action: "report.update",
      entityId: id,
      detail: JSON.stringify({
        status: patch.status,
        gravity: patch.gravity,
        verified: patch.verified,
        author: isAuthor && !isManager,
      }),
    });

    broadcastEvent("report.updated", updated);

    return NextResponse.json({ report: updated });
  } catch (err) {
    console.error("PATCH /api/reports/[id]", err);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    const { id } = await params;

    const existing = await getStore().getReport(id);
    if (!existing) {
      return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
    }

    const isManager = authorize(session, ["admin", "coordinador"]);
    const isAuthor = !!session && existing.createdBy === session.id;
    if (!isManager && !isAuthor) {
      return NextResponse.json(
        {
          error: "No autorizado: solo administradores o el autor del reporte pueden eliminarlo",
        },
        { status: 403 },
      );
    }

    const deleted = await getStore().deleteReport(id);
    if (!deleted) {
      return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
    }

    await getStore().logAudit({
      actorId: session!.id,
      actorName: session!.name,
      action: "report.delete",
      entityId: id,
      detail: isManager
        ? "Reporte eliminado por contener información no verificada"
        : "Reporte eliminado por su autor",
    });

    broadcastEvent("report.deleted", { id });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/reports/[id]", err);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}