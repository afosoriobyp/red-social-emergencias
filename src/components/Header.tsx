import { Siren } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import AccountMenu from "@/components/AccountMenu";
import ChannelsDropdown from "@/components/ChannelsDropdown";

export default async function Header() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3.5">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-600/30">
            <Siren size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold leading-tight text-white">
              Juntos<span className="text-red-400">xRoldanillo</span>
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              Red ciudadana de respuesta ante emergencias
            </p>
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-400 ring-1 ring-inset ring-red-500/30 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            Activo
          </span>
          
          <ChannelsDropdown />

          {session ? (
            <AccountMenu name={session.name} role={session.role} phone={session.phone} />
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/30 hover:bg-red-700"
            >
              Acceder
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}