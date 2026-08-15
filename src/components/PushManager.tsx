"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, X, Loader2 } from "lucide-react";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64url = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64url);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushManager() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!data.user) return;

        const conf = await fetch("/api/push/subscribe").then((r) => r.json());
        if (!conf.enabled || !("serviceWorker" in navigator) || !("PushManager" in window)) {
          return;
        }

        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (mounted) {
          setEnabled(!!sub);
          if (!sub && Notification.permission !== "denied") {
            setVisible(true);
          }
        }
      } catch {
        /* no molestar */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setVisible(false);
        return;
      }
      const conf = await fetch("/api/push/subscribe").then((r) => r.json());
      if (!conf.enabled) return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(conf.publicKey),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("no se pudo guardar");
      setEnabled(true);
      setVisible(false);
    } catch {
      setVisible(false);
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-[1500] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Bell size={19} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900">
            Activa las alertas de emergencia
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Recibe notificaciones push cuando ocurra un incidente crítico,
            incluso con la app cerrada.
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setVisible(false)}
          className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Ahora no
        </button>
        <button
          onClick={enable}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />}
          {enabled ? "Activadas" : "Activar"}
        </button>
      </div>
    </div>
  );
}