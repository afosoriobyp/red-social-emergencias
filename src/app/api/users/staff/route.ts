import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSession, authorize } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAFF_ROLES = ["admin", "coordinador", "voluntario"] as const;

export async function GET() {
  const session = await getSession();
  if (!authorize(session, ["admin", "coordinador"])) {
    return NextResponse.json(
      { error: "No autorizado: se requiere rol de administrador o coordinador" },
      { status: 403 },
    );
  }
  const users = await getStore().listUsers();
  const staff = users
    .filter(
      (u) =>
        u.status === "activo" &&
        (STAFF_ROLES as readonly string[]).includes(u.role),
    )
    .sort((a, b) => {
      const ra = (STAFF_ROLES as readonly string[]).indexOf(a.role);
      const rb = (STAFF_ROLES as readonly string[]).indexOf(b.role);
      return ra - rb || a.name.localeCompare(b.name);
    })
    .map((u) => ({ id: u.id, name: u.name, role: u.role }));

  return NextResponse.json({ staff });
}