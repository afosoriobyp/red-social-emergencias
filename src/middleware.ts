import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PREFIXES = ["/dashboard", "/perfil"];
const ADMIN_PREFIXES = ["/dashboard"];
const LOGIN_PATH = "/login";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-cambia-esto-en-produccion",
);

function getIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

async function getSession(
  request: NextRequest,
): Promise<{ role?: string; status?: string } | null> {
  const token = request.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      role: payload.role as string | undefined,
      status: payload.status as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getIp(request);

  const session = await getSession(request);
  const loggedIn = !!session && session.status === "activo";
  const role = session?.role ?? "usuario";

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdminOnly = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  const isLogin = pathname.startsWith(LOGIN_PATH);

  if (isLogin && loggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isProtected) {
    if (!loggedIn) {
      const url = new URL(LOGIN_PATH, request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (isAdminOnly && role !== "admin" && role !== "coordinador") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Client-IP", ip);
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/perfil/:path*", "/login/:path*"],
};