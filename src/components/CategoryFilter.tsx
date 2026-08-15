"use client";

import { useRef, useState, useEffect } from "react";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/types";
import {
  Home,
  Gift,
  Boxes,
  HeartHandshake,
  HeartPulse,
  Globe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  reporte: Home,
  acopio: Boxes,
  voluntarios: HeartHandshake,
  medico: HeartPulse,
  donaciones: Gift,
  todos: Globe,
};

export default function CategoryFilter({
  active,
  onChange,
}: {
  active: string;
  onChange: (key: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const options = [
    { key: "todos", label: "Todos" },
    ...CATEGORIES.map((c) => ({ key: c, label: CATEGORY_LABELS[c] })),
  ];

  function updateArrows() {
    const el = containerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(
      el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    );
  }

  useEffect(() => {
    updateArrows();
  }, []);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
    updateArrows();
  }, [active]);

  const scrollBy = (dir: 1 | -1) =>
    containerRef.current?.scrollBy({ left: dir * 180, behavior: "smooth" });

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-3 left-0 z-10 w-6 bg-gradient-to-r from-slate-50 to-transparent transition-opacity" style={{ opacity: canScrollLeft ? 1 : 0 }} />
      <div className="pointer-events-none absolute inset-y-3 right-0 z-10 w-6 bg-gradient-to-l from-slate-50 to-transparent transition-opacity" style={{ opacity: canScrollRight ? 1 : 0 }} />

      <div
        ref={containerRef}
        onScroll={updateArrows}
        className="scrollbar-none flex items-center gap-2 overflow-x-auto px-4 py-3 scroll-smooth"
      >
        {options.map((o) => {
          const Icon = ICONS[o.key];
          const isActive = active === o.key;
          return (
            <button
              key={o.key}
              ref={isActive ? activeRef : undefined}
              onClick={() => onChange(o.key)}
              aria-pressed={isActive}
              className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-semibold transition active:scale-95 ${
                isActive
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <Icon size={14} className={isActive ? "text-red-400" : "text-slate-400"} />
              {o.label}
            </button>
          );
        })}
        <div className="w-2 shrink-0" aria-hidden />
      </div>

      {canScrollLeft && (
        <button
          onClick={() => scrollBy(-1)}
          className="absolute left-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/95 p-1.5 text-slate-600 shadow ring-1 ring-black/5 sm:block"
          aria-label="Anterior"
        >
          ‹
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scrollBy(1)}
          className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/95 p-1.5 text-slate-600 shadow ring-1 ring-black/5 sm:block"
          aria-label="Siguiente"
        >
          ›
        </button>
      )}
    </div>
  );
}