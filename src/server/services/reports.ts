import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_REPORT_COLUMNS, UPLOAD_BUCKET } from "@/shared/constants";
import { photoPaths } from "@/shared/photo";
import type { CreateReportInput } from "@/shared/schemas";
import type { MapPoint, PublicReport } from "@/shared/types";
import { reverseGeocode } from "./geocode";
import { processDraftPhotos, syncReportFiles } from "./photo-files";

/* ── Public reads (always fresh; RLS hides hidden/deleted reports + private photos) ── */

/** Deduped per request. */
export const getMapPoints = cache(async (): Promise<MapPoint[]> => {
  await connection();
  const { data, error } = await createPublicClient()
    .from("reports")
    .select("id, report_no, lat, lng, sido")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw error;
  return data.map((r) => ({ id: r.id, reportNo: r.report_no, lat: r.lat, lng: r.lng, sido: r.sido }));
});

export async function getTotalCount(sido?: string) {
  await connection();
  let q = createPublicClient().from("reports").select("id", { count: "exact", head: true });
  if (sido) q = q.eq("sido", sido);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function getReportByNo(reportNo: string): Promise<PublicReport | null> {
  await connection();
  const { data, error } = await createPublicClient()
    .from("reports")
    .select(PUBLIC_REPORT_COLUMNS)
    .eq("report_no", reportNo)
    .order("sort_order", { referencedTable: "report_photos" })
    .maybeSingle();
  if (error) throw error;
  return data as PublicReport | null;
}

export async function getRecentReports(opts: { sido?: string; limit?: number } = {}) {
  await connection();
  let q = createPublicClient()
    .from("reports")
    .select(PUBLIC_REPORT_COLUMNS)
    .order("created_at", { ascending: false })
    .order("sort_order", { referencedTable: "report_photos" })
    .limit(opts.limit ?? 50);
  if (opts.sido) q = q.eq("sido", opts.sido);
  const { data, error } = await q;
  if (error) throw error;
  return data as PublicReport[];
}

/** Reports within ~100m (bounding box), including the given one. */
export async function countNearby(lat: number, lng: number) {
  await connection();
  const dLat = 0.0009;
  const dLng = 0.0011;
  const { count, error } = await createPublicClient()
    .from("reports")
    .select("id", { count: "exact", head: true })
    .gte("lat", lat - dLat).lte("lat", lat + dLat)
    .gte("lng", lng - dLng).lte("lng", lng + dLng);
  if (error) throw error;
  return count ?? 0;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const STATS_WEEKS = 8;

/** UTC timestamp of the Monday 00:00 (KST) that starts the week containing `ms`. */
function kstWeekStart(ms: number) {
  const d = new Date(ms + KST_OFFSET_MS);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d.getTime() - KST_OFFSET_MS;
}

export type WeeklyCount = { start: string; label: string; count: number; current: boolean };

/** Aggregates in JS — fine at MVP scale; move to a SQL view/RPC if reports grow large. */
export async function getStats() {
  await connection(); // request time: also makes Date.now() below legal under Cache Components
  const { data, error } = await createPublicClient()
    .from("reports")
    .select("sido, sigungu, status, created_at")
    .limit(20000);
  if (error) throw error;

  const bySido = new Map<string, number>();
  const byStatus = new Map<string, number>();
  const districts = new Set<string>();
  const thisWeekStart = kstWeekStart(Date.now());
  const firstWeekStart = thisWeekStart - (STATS_WEEKS - 1) * WEEK_MS;
  const weekCounts = new Array<number>(STATS_WEEKS).fill(0);
  let lastWeek = 0;

  for (const r of data) {
    bySido.set(r.sido ?? "기타", (bySido.get(r.sido ?? "기타") ?? 0) + 1);
    byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
    if (r.sido && r.sigungu) districts.add(`${r.sido} ${r.sigungu}`);
    const t = new Date(r.created_at).getTime();
    if (t >= firstWeekStart) {
      const i = Math.floor((t - firstWeekStart) / WEEK_MS);
      if (i < STATS_WEEKS) weekCounts[i]++;
    }
    if (t >= thisWeekStart - WEEK_MS && t < thisWeekStart) lastWeek++;
  }

  const weekly: WeeklyCount[] = weekCounts.map((count, i) => {
    const startMs = firstWeekStart + i * WEEK_MS;
    const kst = new Date(startMs + KST_OFFSET_MS);
    return {
      start: kst.toISOString().slice(0, 10),
      label: `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}`,
      count,
      current: i === STATS_WEEKS - 1,
    };
  });

  return {
    total: data.length,
    thisWeek: weekCounts[STATS_WEEKS - 1],
    lastWeek,
    districtCount: districts.size,
    submitted: byStatus.get("submitted") ?? 0,
    weekly,
    bySido: [...bySido.entries()].sort((a, b) => b[1] - a[1]),
    byStatus: Object.fromEntries(byStatus),
  };
}

/* ── Writes (secret key; callers must validate + rate-limit first) ─────── */

/** One signed upload per photo, into the PRIVATE bucket. */
export async function createSignedUploads(draftId: string, count: number) {
  const storage = createAdminClient().storage.from(UPLOAD_BUCKET);
  return Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const { full } = photoPaths(draftId, i);
      const { data, error } = await storage.createSignedUploadUrl(full);
      if (error) throw error;
      return { path: full, token: data.token };
    }),
  );
}

export async function createReport(input: CreateReportInput, meta: { ipHash: string; userAgent: string }) {
  const admin = createAdminClient();

  // Idempotent retry: the draft already became a report.
  const { data: existing } = await admin.from("reports").select("report_no").eq("id", input.draftId).maybeSingle();
  if (existing) return existing.report_no as string;

  const [photos, geo] = await Promise.all([
    processDraftPhotos(admin, input.draftId, input.photoCount),
    reverseGeocode(input.lat, input.lng),
  ]);

  const { data, error } = await admin.rpc("create_report", {
    p_id: input.draftId,
    p_lat: input.lat,
    p_lng: input.lng,
    p_address: geo.address,
    p_road_address: geo.roadAddress,
    p_sido: geo.sido,
    p_sigungu: geo.sigungu,
    p_photos: photos,
    p_ip_hash: meta.ipHash,
    p_user_agent: meta.userAgent,
    p_memo: input.memo || null,
  });
  if (error) throw error;

  // Publish the blur previews (originals stay private until approved).
  await syncReportFiles(admin, input.draftId);
  return data as string;
}
