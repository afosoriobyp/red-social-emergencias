"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, User, UserCircle } from "lucide-react";
import { ROLE_LABELS, Role } from "@/lib/types";

export default function AccountMenu({
  name,
  role,
  phone,
}: {
  name: string;
  role: Role;
  phone: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const canManage = role === "admin" || role === "coordinador";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative ml-auto">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-white/15"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-xs font-bold">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-[7rem] truncate sm:block">{name}</span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">{name}</p>
              <p className="text-[11px] font-medium text-red-400">
                {ROLE_LABELS[role]}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                <User size={11} /> {phone}
              </p>
            </div>
            <div className="p-1.5">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/perfil");
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-200 hover:bg-white/10"
              >
                <UserCircle size={16} className="text-slate-400" />
                Mi perfil
              </button>
              {canManage && (
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push("/dashboard");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-200 hover:bg-white/10"
                >
                  <LayoutDashboard size={16} className="text-slate-400" />
                  Control de mando
                </button>
              )}
              <button
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-200 hover:bg-red-500/10"
              >
                <LogOut size={16} className="text-slate-400" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}