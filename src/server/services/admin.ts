import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PHOTO_BUCKET, PUBLIC_REPORT_COLUMNS, UPLOAD_BUCKET, type ReportStatus } from "@/shared/constants";
import { photoUrl } from "@/shared/photo";
import type { AdminReport, ReportPhoto } from "@/shared/types";
import { desiredBuckets } from "./photo-files";

// All functions take the ADMIN'S SESSION client: RLS (is_admin()) authorizes every read.

export const ADMIN_PAGE_SIZE = 30;
const ADMIN_COLUMNS = `${PUBLIC_REPORT_COLUMNS}, is_hidden, deleted_at, updated_at`;

export type AdminView = "all" | "public" | "hidden" | "deleted";

export type AdminListFilters = {
  view: AdminView;
  q?: string;
  sido?: string;
  status?: ReportStatus;
  page: number;
};

export async function getAdminStats(db: SupabaseClient) {
  const head = () => db.from("reports").select("id", { count: "exact", head: true });
  const [total, reviewing, submitted, hidden, deleted, pendingPhotos] = await Promise.all([
    head().is("deleted_at", null),
    head().is("deleted_at", null).eq("status", "reviewing"),
    head().is("deleted_at", null).eq("status", "submitted"),
    head().is("deleted_at", null).eq("is_hidden", true),
    head().not("deleted_at", "is", null),
    db
      .from("report_photos")
      .select("id, reports!inner(deleted_at)", { count: "exact", head: true })
      .eq("moderation_status", "pending")
      .is("reports.deleted_at", null),
  ]);
  for (const r of [total, reviewing, submitted, hidden, deleted, pendingPhotos]) if (r.error) throw r.error;
  return {
    total: total.count ?? 0,
    reviewing: reviewing.count ?? 0,
    submitted: submitted.count ?? 0,
    hidden: hidden.count ?? 0,
    deleted: deleted.count ?? 0,
    pendingPhotos: pendingPhotos.count ?? 0,
  };
}

/** Strip characters that have meaning in PostgREST filter syntax. */
function sanitizeSearch(q: string) {
  return q.replace(/[%,()*\\:."']/g, " ").trim().slice(0, 50);
}

export async function listAdminReports(db: SupabaseClient, f: AdminListFilters) {
  let q = db
    .from("reports")
    .select(ADMIN_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("sort_order", { referencedTable: "report_photos" })
    .range((f.page - 1) * ADMIN_PAGE_SIZE, f.page * ADMIN_PAGE_SIZE - 1);

  if (f.view === "deleted") q = q.not("deleted_at", "is", null);
  else {
    q = q.is("deleted_at", null);
    if (f.view === "public") q = q.eq("is_hidden", false);
    if (f.view === "hidden") q = q.eq("is_hidden", true);
  }
  if (f.sido) q = q.eq("sido", f.sido);
  if (f.status) q = q.eq("status", f.status);
  const term = f.q ? sanitizeSearch(f.q) : "";
  if (term) {
    const like = `%${term}%`;
    q = q.or(`address.ilike.${like},road_address.ilike.${like},report_no.ilike.${like},sigungu.ilike.${like}`);
  }

  const { data, count, error } = await q;
  if (error) throw error;
  return { reports: data as unknown as AdminReport[], count: count ?? 0 };
}

export async function getAdminReport(db: SupabaseClient, id: string) {
  const [{ data: report, error }, { data: logs, error: logError }] = await Promise.all([
    db.from("reports").select(ADMIN_COLUMNS).eq("id", id).order("sort_order", { referencedTable: "report_photos" }).maybeSingle(),
    db.from("admin_activity_logs").select("id, action, before, after, created_at, photo_id").eq("report_id", id).order("created_at", { ascending: false }).limit(100),
  ]);
  if (error) throw error;
  if (logError) throw logError;
  return { report: report as unknown as AdminReport | null, logs: logs ?? [] };
}

export type PendingPhoto = ReportPhoto & {
  report: Pick<AdminReport, "id" | "report_no" | "address" | "road_address" | "sido" | "sigungu" | "is_hidden" | "deleted_at" | "created_at">;
};

export async function getPendingPhotos(db: SupabaseClient, limit = 200) {
  const { data, error } = await db
    .from("report_photos")
    .select(
      "id, storage_path, thumb_path, blur_path, width, height, sort_order, moderation_status, created_at, report:reports!inner(id, report_no, address, road_address, sido, sigungu, is_hidden, deleted_at, created_at)",
    )
    .eq("moderation_status", "pending")
    .is("reports.deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data as unknown as PendingPhoto[];
}

export type AdminPhotoUrls = { thumb: string; full: string };

/**
 * URLs the admin can open for each photo. Files currently in the public bucket get
 * public URLs; private ones get short-lived signed URLs (storage RLS: admin only).
 */
export async function getAdminPhotoUrls(
  db: SupabaseClient,
  items: { photo: Pick<ReportPhoto, "id" | "storage_path" | "thumb_path" | "moderation_status">; visible: boolean }[],
): Promise<Record<string, AdminPhotoUrls>> {
  const result: Record<string, AdminPhotoUrls> = {};
  const privatePaths: string[] = [];
  for (const { photo, visible } of items) {
    const where = desiredBuckets(photo.moderation_status, visible);
    if (where.full === PHOTO_BUCKET) {
      result[photo.id] = { thumb: photoUrl(photo.thumb_path), full: photoUrl(photo.storage_path) };
    } else {
      privatePaths.push(photo.thumb_path, photo.storage_path);
    }
  }
  if (privatePaths.length) {
    const { data, error } = await db.storage.from(UPLOAD_BUCKET).createSignedUrls(privatePaths, 60 * 60);
    if (error) throw error;
    const byPath = new Map(data.map((d) => [d.path, d.signedUrl]));
    for (const { photo } of items) {
      if (result[photo.id]) continue;
      result[photo.id] = { thumb: byPath.get(photo.thumb_path) ?? "", full: byPath.get(photo.storage_path) ?? "" };
    }
  }
  return result;
}
