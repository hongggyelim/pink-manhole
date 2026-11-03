import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Cookie-less publishable-key client for public reads in Server Components. */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
