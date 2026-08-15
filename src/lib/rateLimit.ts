import { NextRequest } from "next/server";
import { createHash } from "crypto";

const buckets = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000;
const UNKNOWN_BUCKET_LIMIT = 5;

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimit(
  request: NextRequest,
  max: number,
  scope: string,
  windowMs: number = WINDOW_MS,
): { allowed: boolean; retryAfter: number } {
  const ip = clientIp(request);
  const hashed = ip === "unknown" ? "unknown" : hashIp(ip);
  const effectiveMax = ip === "unknown" ? Math.min(max, UNKNOWN_BUCKET_LIMIT) : max;
  const key = `${scope}:${hashed}`;
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= effectiveMax) {
    const retryAfter = Math.ceil(
      (hits[0] + windowMs - now) / 1000,
    );
    buckets.set(key, hits);
    return { allowed: false, retryAfter };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { allowed: true, retryAfter: 0 };
}