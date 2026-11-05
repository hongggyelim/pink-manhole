import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Route } from "@/shared/routes";

/**
 * Runs only for /admin/*: refreshes the Supabase session cookie and sends
 * signed-out visitors to /admin/login. This is a convenience layer — every admin
 * page/action re-checks permissions on the server, and RLS checks them again in the DB.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  // Refreshes the session cookie when needed and verifies the JWT locally (no Auth round trip).
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const isLogin = request.nextUrl.pathname === Route.AdminLogin;
  if (!signedIn && !isLogin) {
    return NextResponse.redirect(new URL(Route.AdminLogin, request.url));
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
