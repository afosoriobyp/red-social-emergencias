"use client";

import { LayoutList, Map, Plus } from "lucide-react";

export type ViewMode = "feed" | "map";

export default function BottomBar({
  view,
  onView,
  onReport,
}: {
  view: ViewMode;
  onView: (v: ViewMode) => void;
  onReport: () => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        <NavButton active={view === "feed"} onClick={() => onView("feed")} label="Feed">
          <LayoutList size={18} />
        </NavButton>

        <button
          onClick={onReport}
          aria-label="Reportar emergencia"
          className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-xl shadow-red-600/40 ring-4 ring-slate-900 transition hover:scale-105 active:scale-95"
          style={{ height: 52, width: 52, marginTop: -28 }}
        >
          <Plus size={24} />
        </button>

        <NavButton active={view === "map"} onClick={() => onView("map")} label="Mapa">
          <Map size={18} />
        </NavButton>
      </div>
    </nav>
  );
}

function NavButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium"
    >
      {children}
      <span className={active ? "text-red-400" : "text-gray-400"}>{label}</span>
    </button>
  );
}