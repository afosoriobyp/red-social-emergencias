/**
 * Bus de eventos para tiempo real (SSE).
 * - Entrega a los clientes conectados en esta instancia.
 * - Propaga los eventos a otras instancias vía el bus pub/sub
 *   (memoria en monoproceso, Redis si hay REDIS_URL).
 * - Mantiene un historial corto para replay con Last-Event-ID.
 */

import { getEventBus } from "@/lib/eventBus";

interface Sink {
  controller: ReadableStreamDefaultController;
}

const clients = new Set<Sink>();
const MAX_CLIENTS = 1000;
const HISTORY_MAX = 200;

interface HistoryEntry {
  seq: number;
  payload: string;
}

const HISTORY: HistoryEntry[] = [];
let seq = 0;

export function addClient(
  controller: ReadableStreamDefaultController<Uint8Array>,
) {
  if (clients.size >= MAX_CLIENTS) {
    const oldest = clients.values().next().value as Sink | undefined;
    if (oldest) clients.delete(oldest);
  }
  clients.add({ controller });
}

export function removeClient(
  controller: ReadableStreamDefaultController<Uint8Array>,
) {
  for (const c of clients) {
    if (c.controller === controller) {
      clients.delete(c);
      return;
    }
  }
}

const encoder = new TextEncoder();

function enqueue(sink: Sink, bytes: Uint8Array) {
  try {
    sink.controller.enqueue(bytes);
  } catch {
    clients.delete(sink);
  }
}

function deliver(payload: string) {
  const bytes = encoder.encode(payload);
  for (const c of clients) enqueue(c, bytes);
}

export function broadcastEvent(event: string, data: unknown) {
  seq += 1;
  const id = `${Date.now()}-${seq}`;
  const payload = `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  HISTORY.push({ seq, payload });
  if (HISTORY.length > HISTORY_MAX) HISTORY.shift();
  deliver(payload);
  getEventBus()
    .publish(payload)
    .catch(() => {
      /* propagación best-effort */
    });
}

const heartbeatBytes = encoder.encode(":\n\n");

function heartbeat() {
  for (const c of clients) enqueue(c, heartbeatBytes);
}

setInterval(heartbeat, 25000);
setInterval(() => {
  /* mantiene el proceso vivo si hay clientes */
}, 60000);

getEventBus()
  .subscribe(deliver)
  .catch(() => {
    /* sin broker: solo eventos locales */
  });

/** Devuelve los eventos del historial posteriores a `lastSeq` (replay). */
export function replaySince(lastSeq: number): string[] {
  return HISTORY.filter((h) => h.seq > lastSeq).map((h) => h.payload);
}

export function clientCount() {
  return clients.size;
}