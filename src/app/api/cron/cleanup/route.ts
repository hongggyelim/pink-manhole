import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UPLOAD_BUCKET } from "@/shared/constants";

/** Drafts older than this that never became a report are deleted (signed upload URLs live 2h). */
const ORPHAN_AFTER_MS = 24 * 60 * 60 * 1000;
const PAGE = 1000;

/**
 * Daily maintenance (Vercel Cron, vercel.json). System job, so it uses the secret-key client.
 *  - deletes orphan upload drafts (files in report-uploads whose draftId never became a report)
 *  - purge_expired_data(): old rate-limit hits, 90-day wipe of IP hash / User-Agent
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; without CRON_SECRET the job refuses to run.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const storage = admin.storage.from(UPLOAD_BUCKET);

  // Top-level entries of the private bucket are draft/report id folders.
  const folders: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await storage.list("", { limit: PAGE, offset });
    if (error) throw error;
    folders.push(...data.filter((e) => e.id === null).map((e) => e.name));
    if (data.length < PAGE) break;
  }

  const existing = new Set<string>();
  for (let i = 0; i < folders.length; i += 200) {
    const { data, error } = await admin.from("reports").select("id").in("id", folders.slice(i, i + 200));
    if (error) throw error;
    data.forEach((r) => existing.add(r.id as string));
  }

  let removedFiles = 0;
  let removedDrafts = 0;
  const cutoff = Date.now() - ORPHAN_AFTER_MS;
  for (const folder of folders) {
    if (existing.has(folder)) continue;
    const { data: files, error } = await storage.list(folder, { limit: 100 });
    if (error) throw error;
    if (!files.length) continue;
    const newest = Math.max(...files.map((f) => new Date(f.created_at ?? 0).getTime()));
    if (newest > cutoff) continue; // still possibly in progress
    const { error: rmError } = await storage.remove(files.map((f) => `${folder}/${f.name}`));
    if (rmError) throw rmError;
    removedFiles += files.length;
    removedDrafts++;
  }

  const { data: purged, error: purgeError } = await admin.rpc("purge_expired_data");
  if (purgeError) throw purgeError;

  const result = { removedDrafts, removedFiles, ...(purged as object) };
  console.log("[cron/cleanup]", result);
  return NextResponse.json(result);
}
