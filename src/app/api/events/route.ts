import { NextRequest } from "next/server";
import { addClient, removeClient, replaySince } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLastSeq(lastEventId: string | null): number {
  if (!lastEventId) return 0;
  const m = lastEventId.match(/-(\d+)$/);
  if (!m) return 0;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const lastSeq = parseLastSeq(request.headers.get("last-event-id"));
  let ctrl: ReadableStreamDefaultController<Uint8Array> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      ctrl = controller;
      addClient(controller);
      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      for (const payload of replaySince(lastSeq)) {
        controller.enqueue(encoder.encode(payload));
      }
    },
    cancel() {
      if (ctrl) removeClient(ctrl);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}