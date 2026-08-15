"use client";

import { useEffect, useRef, useState } from "react";
import { Report } from "@/lib/types";

function playAlert() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = [880, 660, 880, 660];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.28);
      gain.gain.exponentialRampToValueAtTime(0.4, now + i * 0.28 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.28 + 0.24);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.28);
      osc.stop(now + i * 0.28 + 0.26);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {
    /* audio no disponible */
  }
}

export function useCriticalAlert(reports: Report[]) {
  const [alert, setAlert] = useState<Report | null>(null);
  const known = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const r of reports) known.current.add(r.id);
    // solo inicial: no alarmar con reportes ya cargados
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    for (const r of reports) {
      const isActiveCritical =
        r.gravity === "critica" && (r.status ?? "activo") !== "resuelto";
      if (isActiveCritical && !known.current.has(r.id)) {
        known.current.add(r.id);
        playAlert();
        setAlert(r);
      }
    }
  }, [reports]);

  return { alert, dismiss: () => setAlert(null) };
}