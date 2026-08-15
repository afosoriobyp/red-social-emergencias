import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Role, User } from "./types";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-cambia-esto-en-produccion",
);
const COOKIE_NAME = "session";

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  status: "pendiente" | "activo" | "bloqueado";
  phone: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    name: user.name,
    role: user.role,
    status: user.status,
    phone: user.phone,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      name: (payload.name as string) ?? "",
      role: (payload.role as Role) ?? "usuario",
      status: (payload.status as SessionUser["status"]) ?? "activo",
      phone: (payload.phone as string) ?? "",
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const token = await readSessionToken();
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function authorize(user: SessionUser | null, roles: Role[]): boolean {
  return !!user && roles.includes(user.role);
}

export function toSessionUser(u: User): SessionUser {
  return { id: u.id, name: u.name, role: u.role, status: u.status, phone: u.phone };
}