"use client";

import { useEffect, useState } from "react";
import { ROLES, ROLE_LABELS, Role, USER_STATUS_LABELS } from "@/lib/types";
import {
  Loader2,
  UserPlus,
  ShieldCheck,
  UserCog,
  AlertCircle,
  Trash2,
  AlertTriangle,
  X,
  UserCheck,
  Ban,
  KeyRound,
} from "lucide-react";

type UserItem = {
  id: string;
  name: string;
  phone: string;
  role: Role;
  status: "pendiente" | "activo" | "bloqueado";
};

export default function UsersPanel() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("usuario");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<UserItem | null>(null);
  const [pendingReset, setPendingReset] = useState<UserItem | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  useEffect(() => {
    let mounted = true;
    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error");
        if (mounted) {
          setUsers(data.users);
          setError("");
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "No se pudo cargar usuarios");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchUsers();
    return () => {
      mounted = false;
    };
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setUsers((prev) => [...prev, data.user]);
      setName("");
      setPhone("");
      setPassword("");
      setRole("usuario");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(id: string, newRole: Role) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar rol");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(
    id: string,
    status: "pendiente" | "activo" | "bloqueado",
  ) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar estado");
    } finally {
      setBusy(false);
    }
  }

  async function removeUser(id: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error");
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setBusy(false);
    }
  }

  async function resetUserPassword() {
    if (!pendingReset) return;
    if (resetPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${pendingReset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setPendingReset(null);
      setResetPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al restablecer contraseña");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <UserPlus size={13} /> Crear usuario
        </p>
        <form onSubmit={create} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre completo"
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Teléfono (WhatsApp, ej. 57XXXXXXXXX)"
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Contraseña (mín. 6)"
            required
            minLength={6}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
            Crear
          </button>
        </form>
        <p className="mt-2 text-[11px] text-slate-400">
          El nuevo usuario ya podrá iniciar sesión en la app con el teléfono y la
          contraseña indicados.
        </p>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          <AlertCircle size={13} /> {error}
        </p>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <UserCog size={13} /> Usuarios registrados ({users.length})
        </p>
        {loading ? (
          <p className="flex items-center gap-2 py-6 text-sm text-slate-400">
            <Loader2 size={15} className="animate-spin" /> Cargando…
          </p>
        ) : users.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Aún no hay usuarios registrados.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {users.map((u) => {
              const isAdmin = u.role === "admin";
              const roleBg =
                u.role === "admin"
                  ? "bg-red-50 text-red-600"
                  : u.role === "coordinador"
                    ? "bg-blue-50 text-blue-600"
                    : u.role === "voluntario"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-slate-100 text-slate-600";
              const statusBg =
                u.status === "pendiente"
                  ? "bg-amber-50 text-amber-600"
                  : u.status === "bloqueado"
                    ? "bg-red-50 text-red-600"
                    : "bg-emerald-50 text-emerald-600";
              return (
                <li
                  key={u.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm transition hover:border-slate-200 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${roleBg}`}
                    >
                      {initials(u.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-800">
                        {u.name}
                        {isAdmin && (
                          <ShieldCheck size={14} className="shrink-0 text-red-500" />
                        )}
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBg}`}
                        >
                          {USER_STATUS_LABELS[u.status]}
                        </span>
                      </p>
                      <p className="truncate text-xs text-slate-400">{u.phone}</p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleBg}`}
                      >
                        {ROLE_LABELS[u.role]}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {u.status === "pendiente" && (
                      <button
                        onClick={() => changeStatus(u.id, "activo")}
                        disabled={busy}
                        title="Aprobar acceso"
                        className="flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <UserCheck size={13} /> Aprobar
                      </button>
                    )}

                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value as Role)}
                      disabled={busy}
                      title="Cambiar rol"
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 outline-none transition focus:border-blue-500 disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>

                    {u.status !== "pendiente" &&
                      (u.status === "activo" ? (
                        <button
                          onClick={() => changeStatus(u.id, "bloqueado")}
                          disabled={busy}
                          title="Bloquear acceso"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                        >
                          <Ban size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => changeStatus(u.id, "activo")}
                          disabled={busy}
                          title="Restablecer acceso"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <UserCheck size={14} />
                        </button>
                      ))}

                    <button
                      onClick={() => setPendingReset(u)}
                      disabled={busy}
                      title="Restablecer contraseña"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-500 transition hover:bg-violet-100 hover:text-violet-600 disabled:opacity-50"
                    >
                      <KeyRound size={14} />
                    </button>

                    <button
                      onClick={() => setPendingDelete(u)}
                      disabled={busy}
                      title="Eliminar usuario"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertTriangle size={22} />
              </span>
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 pt-3">
              <h3 className="text-base font-bold text-slate-900">Eliminar usuario</h3>
              <p className="mt-1.5 text-sm text-slate-500">
                Vas a eliminar permanentemente a:
              </p>
              <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                “{pendingDelete.name}” ({pendingDelete.phone})
              </p>
              <p className="mt-3 text-xs text-slate-400">
                Perderá el acceso a la app, se eliminarán todos sus reportes
                (en tiempo real para todos los usuarios) y quedará registrado en
                la auditoría.
              </p>
            </div>
            <div className="mt-5 flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                onClick={() => setPendingDelete(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => removeUser(pendingDelete.id)}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                {busy ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    {pendingReset && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <KeyRound size={22} />
              </span>
              <button
                onClick={() => {
                  setPendingReset(null);
                  setResetPassword("");
                }}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 pt-3">
              <h3 className="text-base font-bold text-slate-900">
                Restablecer contraseña
              </h3>
              <p className="mt-1.5 text-sm text-slate-500">
                Nueva contraseña para{" "}
                <span className="font-semibold text-slate-700">
                  {pendingReset.name}
                </span>{" "}
                ({pendingReset.phone}).
              </p>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Nueva contraseña (mín. 6)"
                minLength={6}
                autoFocus
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
              />
            </div>
            <div className="mt-5 flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                onClick={() => {
                  setPendingReset(null);
                  setResetPassword("");
                }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={resetUserPassword}
                disabled={busy || resetPassword.length < 6}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 hover:bg-violet-700 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <KeyRound size={16} />
                )}
                {busy ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}