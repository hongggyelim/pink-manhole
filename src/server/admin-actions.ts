"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { REPORT_STATUSES, type PhotoModeration } from "@/shared/constants";
import { adminPhotoDecisionSchema, adminReportIdSchema } from "@/shared/schemas";
import { ForbiddenError, requireAdminAction } from "./auth";
import { hitRateLimit } from "./services/abuse";
import { syncReportFiles } from "./services/photo-files";
import { Route } from "@/shared/routes";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function run(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: e.message };
    console.error("admin action failed", e);
    return { ok: false, error: "처리에 실패했어요. 다시 시도해주세요." };
  }
}

/* ── Auth ──────────────────────────────────────────────────────────────── */

const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(200) });

export async function signIn(_prev: string | null, formData: FormData): Promise<string | null> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return "이메일과 비밀번호를 확인해주세요.";
  if (await hitRateLimit("login", await headers())) return "로그인 시도가 너무 많아요. 15분 후 다시 시도해주세요.";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return "이메일 또는 비밀번호가 올바르지 않아요.";
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    return "관리자 권한이 없는 계정이에요.";
  }
  redirect(Route.Admin);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(Route.AdminLogin);
}

/* ── Moderation (DB function does the change + activity log atomically; then files are synced) ── */

/** `pending` = 검토 취소. */
export async function moderatePhoto(photoId: string, decision: PhotoModeration): Promise<ActionResult> {
  return run(async () => {
    const input = adminPhotoDecisionSchema.parse({ photoId, decision });
    const { supabase } = await requireAdminAction();
    const { data: reportId, error } = await supabase.rpc("admin_moderate_photo", {
      p_photo_id: input.photoId,
      p_decision: input.decision,
    });
    if (error) throw error;
    await syncReportFiles(supabase, reportId as string);
  });
}

export async function setReportStatus(reportId: string, status: string): Promise<ActionResult> {
  return run(async () => {
    const id = adminReportIdSchema.parse(reportId);
    const s = z.enum(Object.keys(REPORT_STATUSES) as [string, ...string[]]).parse(status);
    const { supabase } = await requireAdminAction();
    const { error } = await supabase.rpc("admin_set_status", { p_report_id: id, p_status: s });
    if (error) throw error;
  });
}

export async function setReportHidden(reportId: string, hidden: boolean): Promise<ActionResult> {
  return run(async () => {
    const id = adminReportIdSchema.parse(reportId);
    const { supabase } = await requireAdminAction();
    const { error } = await supabase.rpc("admin_set_hidden", { p_report_id: id, p_hidden: z.boolean().parse(hidden) });
    if (error) throw error;
    await syncReportFiles(supabase, id);
  });
}

export async function setReportDeleted(reportId: string, deleted: boolean): Promise<ActionResult> {
  return run(async () => {
    const id = adminReportIdSchema.parse(reportId);
    const { supabase } = await requireAdminAction();
    const { error } = await supabase.rpc("admin_set_deleted", { p_report_id: id, p_deleted: z.boolean().parse(deleted) });
    if (error) throw error;
    await syncReportFiles(supabase, id);
  });
}

const bulkIdsSchema = z.array(adminReportIdSchema).min(1).max(100);

/** Actions the admin list runs on one report or on a selection. Keep in sync with REPORT_ACTIONS in the list UI. */
export type ReportAction =
  | "approve_photos" | "private_photos" | "reset_photos"
  | "hide" | "unhide" | "delete" | "restore";
const reportActionSchema = z.enum([
  "approve_photos", "private_photos", "reset_photos", "hide", "unhide", "delete", "restore",
]);

/**
 * Runs one action on each report. Every report goes through its own SQL function call (one
 * transaction + activity log each), in parallel, then its files are synced to the right bucket.
 */
export async function runReportAction(reportIds: string[], action: ReportAction): Promise<ActionResult> {
  return run(async () => {
    const ids = [...new Set(bulkIdsSchema.parse(reportIds))];
    const a = reportActionSchema.parse(action);
    const { supabase } = await requireAdminAction();
    const rpc = (id: string) => {
      switch (a) {
        case "approve_photos": return supabase.rpc("admin_moderate_report_photos", { p_report_id: id, p_decision: "approved" });
        case "private_photos": return supabase.rpc("admin_moderate_report_photos", { p_report_id: id, p_decision: "private" });
        case "reset_photos": return supabase.rpc("admin_moderate_report_photos", { p_report_id: id, p_decision: "pending" });
        case "hide": return supabase.rpc("admin_set_hidden", { p_report_id: id, p_hidden: true });
        case "unhide": return supabase.rpc("admin_set_hidden", { p_report_id: id, p_hidden: false });
        case "delete": return supabase.rpc("admin_set_deleted", { p_report_id: id, p_deleted: true });
        case "restore": return supabase.rpc("admin_set_deleted", { p_report_id: id, p_deleted: false });
      }
    };
    await Promise.all(
      ids.map(async (id) => {
        const { error } = await rpc(id);
        if (error) throw error;
        await syncReportFiles(supabase, id);
      }),
    );
  });
}
