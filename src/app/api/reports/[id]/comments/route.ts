import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSession } from "@/lib/auth";
import { broadcastEvent } from "@/lib/events";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const report = await getStore().getReport(id);
    if (!report) {
      return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
    }
    const comments = await getStore().listComments(id);
    return NextResponse.json({ comments });
  } catch (err) {
    console.error("GET comments", err);
    return NextResponse.json({ error: "Error al cargar comentarios" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rl = rateLimit(request, 20, "comments");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Demasiados comentarios. Intenta en ${rl.retryAfter}s.` },
        { status: 429 },
      );
    }

    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para comentar" },
        { status: 401 },
      );
    }
    if (session.role !== "admin" && session.role !== "coordinador") {
      const me = await getStore().findUserByIdentifier(session.phone);
      if (me && me.status !== "activo") {
        return NextResponse.json(
          { error: "Tu cuenta está pendiente de aprobación." },
          { status: 403 },
        );
      }
    }

    const report = await getStore().getReport(id);
    if (!report) {
      return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
    }

    const body = (await request.json()) as { content?: string };
    const content = body.content?.trim() ?? "";
    if (!content) {
      return NextResponse.json({ error: "El comentario no puede estar vacío" }, { status: 400 });
    }
    if (content.length > 500) {
      return NextResponse.json({ error: "Máximo 500 caracteres" }, { status: 400 });
    }

    const comment = await getStore().addComment({
      reportId: id,
      authorId: session.id,
      authorName: session.name,
      content,
    });

    broadcastEvent("comment.created", { reportId: id, comment });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    console.error("POST comments", err);
    return NextResponse.json({ error: "Error al publicar comentario" }, { status: 500 });
  }
}