import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Secret-key client that BYPASSES RLS. Use only inside src/server/ services,
 * after validating input / checking admin permissions.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
