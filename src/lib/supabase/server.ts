import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

/** Server client bound to the request's cookies (publishable key, respects RLS). */
export async function createClient() {
  const cookieStore = await cookies();
  // Session handling in auth-js reads Date.now() (token expiry). With Cache Components +
  // partial prefetching, a render that has cookies is still a prerender, where Date.now()
  // is rejected — so explicitly defer to request time first.
  await connection();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — cookies are read-only there.
          }
        },
      },
    },
  );
}
