import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const RATE_LIMIT = { maxReports: 5, windowMinutes: 10 };

/** Per-IP limits for the other public/expensive endpoints (scope → max hits per window). */
export const RATE_LIMITS = {
  /** Signed upload drafts. CGNAT on Korean mobile networks puts many users behind one IP, so not lower. */
  upload: { max: 20, windowSeconds: 60 * 60 },
  /** Reverse-geocode previews (every map drag) — protects the Kakao REST quota. */
  geocode: { max: 120, windowSeconds: 10 * 60 },
  /** Admin sign-in attempts. */
  login: { max: 10, windowSeconds: 15 * 60 },
} as const;
export type RateLimitScope = keyof typeof RATE_LIMITS;

/** On Vercel, x-forwarded-for is set by the platform (client values are overwritten). */
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

let warnedSalt = false;
function ipSalt() {
  const salt = process.env.IP_HASH_SALT;
  if (salt) return salt;
  // Never hash with an empty salt: the IPv4 space is small enough to brute-force unsalted hashes.
  // Fall back to a value derived from the (secret, high-entropy) Supabase secret key.
  if (!warnedSalt) {
    warnedSalt = true;
    console.warn("[abuse] IP_HASH_SALT is not set — using a salt derived from SUPABASE_SECRET_KEY. Set IP_HASH_SALT.");
  }
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("IP_HASH_SALT (or SUPABASE_SECRET_KEY) must be set");
  return createHash("sha256").update(`ip-salt:${secret}`).digest("hex");
}

export function hashIp(ip: string) {
  return createHash("sha256").update(`${ipSalt()}:${ip}`).digest("hex");
}

export async function isRateLimited(ipHash: string) {
  const { data, error } = await createAdminClient().rpc("count_recent_reports", {
    p_ip_hash: ipHash,
    p_minutes: RATE_LIMIT.windowMinutes,
  });
  if (error) throw error;
  return (data as number) >= RATE_LIMIT.maxReports;
}

/** Records one hit for (scope, IP) and returns true when the limit is already reached. */
export async function hitRateLimit(scope: RateLimitScope, headers: Headers) {
  const { max, windowSeconds } = RATE_LIMITS[scope];
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_scope: scope,
    p_key: hashIp(clientIp(headers)),
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    // Migration 20261105134554 not applied yet → don't take the endpoint down; log loudly.
    if (error.code === "PGRST202") {
      console.error("[abuse] hit_rate_limit() missing — run `supabase db push`. Rate limit skipped.");
      return false;
    }
    throw error;
  }
  return data === true;
}
