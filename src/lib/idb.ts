/**
 * IndexedDB helper para offline-first.
 * Guarda reportes en caché y cola de acciones pendientes (crear reporte).
 */

const DB_NAME = "red-emergencias-offline";
const DB_VERSION = 1;

interface QueuedAction {
  id?: number;
  type: "createReport";
  payload: Record<string, unknown>;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("reports")) {
        db.createObjectStore("reports", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("queue")) {
        db.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheReports(reports: Array<{ id: string } & Record<string, unknown>>) {
  try {
    const db = await openDB();
    const tx = db.transaction("reports", "readwrite");
    const store = tx.objectStore("reports");
    for (const r of reports) store.put(r);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignora si falla (modo privado, cuota, etc.) */
  }
}

export async function getCachedReports(): Promise<Array<{ id: string } & Record<string, unknown>>> {
  try {
    const db = await openDB();
    const tx = db.transaction("reports", "readonly");
    const store = tx.objectStore("reports");
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as Array<{ id: string } & Record<string, unknown>>);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function enqueueAction(type: QueuedAction["type"], payload: Record<string, unknown>) {
  try {
    const db = await openDB();
    const tx = db.transaction("queue", "readwrite");
    const store = tx.objectStore("queue");
    store.add({ type, payload, timestamp: Date.now() });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignora */
  }
}

export async function getQueuedActions(): Promise<QueuedAction[]> {
  try {
    const db = await openDB();
    const tx = db.transaction("queue", "readonly");
    const store = tx.objectStore("queue");
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as QueuedAction[]);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function clearQueue(ids: number[]) {
  try {
    const db = await openDB();
    const tx = db.transaction("queue", "readwrite");
    const store = tx.objectStore("queue");
    for (const id of ids) store.delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignora */
  }
}

export function isOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}

export function onOnline(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", cb);
  return () => window.removeEventListener("online", cb);
}