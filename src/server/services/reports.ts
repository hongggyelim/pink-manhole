import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { PHOTO_BUCKET } from "@/shared/constants";
import { photoPaths } from "@/shared/photo";
import type { CreateReportInput } from "@/shared/schemas";
import type { MapPoint, PublicReport } from "@/shared/types";
import { reverseGeocode } from "./geocode";

const REPORT_COLUMNS =
  "id, report_no, status, lat, lng, address, road_address, sido, sigungu, created_at, report_photos(storage_path, thumb_path, width, height, sort_order)";

/* ── Public reads (always fresh: called at request time) ───────────────── */

/** Deduped per request (home renders banner + map from the same data). */
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

export async function getTotalCount() {
  await connection();
  const { count, error } = await createPublicClient()
    .from("reports")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getReportByNo(reportNo: string): Promise<PublicReport | null> {
  await connection();
  const { data, error } = await createPublicClient()
    .from("reports")
    .select(REPORT_COLUMNS)
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
    .select(REPORT_COLUMNS)
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

/** Aggregates in JS — fine at MVP scale; move to a SQL view/RPC if reports grow large. */
export async function getStats() {
  await connection();
  const { data, error } = await createPublicClient()
    .from("reports")
    .select("sido, status")
    .limit(20000);
  if (error) throw error;
  const bySido = new Map<string, number>();
  const byStatus = new Map<string, number>();
  for (const r of data) {
    const key = r.sido ?? "기타";
    bySido.set(key, (bySido.get(key) ?? 0) + 1);
    byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
  }
  return {
    total: data.length,
    bySido: [...bySido.entries()].sort((a, b) => b[1] - a[1]),
    byStatus: Object.fromEntries(byStatus),
  };
}

/* ── Writes (secret key; callers must validate + rate-limit first) ─────── */

export async function createSignedUploads(draftId: string, count: number) {
  const storage = createAdminClient().storage.from(PHOTO_BUCKET);
  const uploads = [];
  for (let i = 0; i < count; i++) {
    const { full, thumb } = photoPaths(draftId, i);
    const [a, b] = await Promise.all([
      storage.createSignedUploadUrl(full),
      storage.createSignedUploadUrl(thumb),
    ]);
    if (a.error || b.error) throw a.error ?? b.error;
    uploads.push({
      full: { path: full, token: a.data.token },
      thumb: { path: thumb, token: b.data.token },
    });
  }
  return uploads;
}

export class ReportError extends Error {
  constructor(public code: "photos_missing", message: string) {
    super(message);
  }
}

export async function createReport(
  input: CreateReportInput,
  meta: { ipHash: string; userAgent: string },
) {
  const admin = createAdminClient();

  // Verify every expected file was actually uploaded under this draft folder.
  const { data: files, error: listError } = await admin.storage
    .from(PHOTO_BUCKET)
    .list(input.draftId, { limit: 20 });
  if (listError) throw listError;
  const names = new Set(files.map((f) => f.name));
  const photos = input.photos.map((p, i) => {
    const { full, thumb } = photoPaths(input.draftId, i);
    if (!names.has(full.split("/")[1]) || !names.has(thumb.split("/")[1])) {
      throw new ReportError("photos_missing", "업로드된 사진을 찾을 수 없습니다.");
    }
    return { storage_path: full, thumb_path: thumb, width: p.width, height: p.height };
  });

  const geo = await reverseGeocode(input.lat, input.lng);

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
  });
  if (error) throw error;
  return data as string;
}
