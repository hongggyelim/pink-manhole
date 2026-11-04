import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { Route } from "@/shared/routes";

export type AdminContext =
  | { state: "anon" }
  | { state: "forbidden"; email: string | null }
  | { state: "admin"; userId: string; email: string | null; supabase: Awaited<ReturnType<typeof createClient>> };

/**
 * Resolves the current admin session (deduped per request).
 * Uses the user's own session, so every query below also goes through RLS.
 */
export const getAdminContext = cache(async (): Promise<AdminContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "anon" };
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || !isAdmin) return { state: "forbidden", email: user.email ?? null };
  return { state: "admin", userId: user.id, email: user.email ?? null, supabase };
});

/** For admin pages: redirect if signed out; non-admins are handled by the layout gate. */
export async function requireAdminPage() {
  const ctx = await getAdminContext();
  if (ctx.state === "anon") redirect(Route.AdminLogin);
  if (ctx.state !== "admin") redirect(Route.AdminForbidden);
  return ctx;
}

export class ForbiddenError extends Error {}

/** For server actions / route handlers: throw instead of redirecting. */
export async function requireAdminAction() {
  const ctx = await getAdminContext();
  if (ctx.state !== "admin") throw new ForbiddenError("관리자 권한이 필요합니다.");
  return ctx;
}
