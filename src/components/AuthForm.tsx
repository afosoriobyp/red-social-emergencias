"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Siren, Loader2, UserPlus, LogIn, ArrowLeft } from "lucide-react";

type Mode = "login" | "register";

export default function AuthForm() {
  const router = useRouter();
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "JuntosxRoldanillo";
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    identifier: "",
    password: "",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { identifier: form.identifier, password: form.password }
          : { name: form.name, phone: form.identifier, password: form.password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error de autenticación");
      const role = data.user?.role;
      if (role === "admin" || role === "coordinador") {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de autenticación");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-900">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10"
        >
          <ArrowLeft size={16} /> Volver
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-xl shadow-red-600/30">
          <Siren size={28} />
        </span>
<h1 className="mt-4 text-2xl font-extrabold text-white">
            {appName.split("x")[1] ? (
              <>
                {appName.split("x")[0]}
                <span className="text-red-400">x{appName.split("x").slice(1).join("x")}</span>
              </>
            ) : (
              appName
            )}
          </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          {mode === "login"
            ? "Inicia sesión para gestionar la emergencia"
            : "Crea tu cuenta de respuesta o coordinación"}
        </p>

        <div className="mt-8 w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="mb-5 flex rounded-xl bg-white/10 p-1">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
                  mode === m ? "bg-white text-slate-900" : "text-slate-300"
                }`}
              >
                {m === "login" ? <LogIn size={15} /> : <UserPlus size={15} />}
                {m === "login" ? "Acceder" : "Registrar"}
              </button>
            ))}
          </div>

          {error && (
            <p className="mb-4 rounded-xl bg-red-500/15 px-3.5 py-2.5 text-xs font-medium text-red-300">
              {error}
            </p>
          )}

          <form onSubmit={submit} className="space-y-3">
            {mode === "register" && (
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Nombre completo"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-red-500"
              />
            )}
            <input
              value={form.identifier}
              onChange={(e) => set("identifier", e.target.value)}
              placeholder={mode === "login" ? "Teléfono" : "Teléfono (whatsapp)"}
              inputMode="tel"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-red-500"
            />
            <input
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              type="password"
              placeholder="Contraseña (mín. 6)"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-red-500"
            />
            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-red-500 to-red-700 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/30 hover:brightness-110 disabled:opacity-60"
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : <Siren size={17} />}
              {loading
                ? "Procesando…"
                : mode === "login"
                  ? "Iniciar sesión"
                  : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] text-slate-500">
            Los administradores se registran con un teléfono autorizado en el
            servidor.
          </p>
        </div>
      </div>
    </div>
  );
}