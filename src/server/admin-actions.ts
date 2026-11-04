"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { REPORT_STATUSES } from "@/shared/constants";
import { adminPhotoDecisionSchema, adminReportIdSchema } from "@/shared/schemas";
import { ForbiddenError, requireAdminAction } from "./auth";
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

export async function moderatePhoto(photoId: string, decision: "approved" | "private"): Promise<ActionResult> {
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
