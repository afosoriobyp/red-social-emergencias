"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/types";
import { X, MessageSquare, ChevronDown } from "lucide-react";

export default function ChannelsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        aria-label="Canales"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MessageSquare size={18} />
        <span className="hidden sm:inline">Canales</span>
        {open ? <X size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-700 shadow-lg py-1 animate-in fade-in-0 zoom-in-95 duration-150">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/canal/${c}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-red-400 bg-red-500/10">
                {CATEGORY_LABELS[c]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}