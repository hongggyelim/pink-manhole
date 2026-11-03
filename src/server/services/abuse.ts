import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const RATE_LIMIT = { maxReports: 5, windowMinutes: 10 };

export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

export function hashIp(ip: string) {
  return createHash("sha256").update(`${process.env.IP_HASH_SALT ?? ""}:${ip}`).digest("hex");
}

export async function isRateLimited(ipHash: string) {
  const { data, error } = await createAdminClient().rpc("count_recent_reports", {
    p_ip_hash: ipHash,
    p_minutes: RATE_LIMIT.windowMinutes,
  });
  if (error) throw error;
  return (data as number) >= RATE_LIMIT.maxReports;
}
