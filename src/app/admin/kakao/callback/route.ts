import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext } from "@/server/auth";
import { connectKakao, KAKAO_STATE_COOKIE } from "@/server/services/kakao-notify";
import { Route, withQuery } from "@/shared/routes";

/** Kakao OAuth redirect: checks admin + CSRF state, stores the tokens, sends a test message. */
export async function GET(req: NextRequest) {
  const ctx = await getAdminContext();
  if (ctx.state !== "admin") {
    return NextResponse.redirect(new URL(ctx.state === "anon" ? Route.AdminLogin : Route.AdminForbidden, req.url));
  }
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const back = (kakao: string) => {
    const res = NextResponse.redirect(new URL(withQuery(Route.Admin, { kakao }), req.url));
    res.cookies.delete({ name: KAKAO_STATE_COOKIE, path: Route.AdminKakaoCallback });
    return res;
  };

  if (!code || !state || state !== req.cookies.get(KAKAO_STATE_COOKIE)?.value) return back("failed");
  try {
    const redirectUri = new URL(Route.AdminKakaoCallback, req.nextUrl.origin).toString();
    await connectKakao(ctx.supabase, code, redirectUri);
    return back("connected");
  } catch (e) {
    console.error("[kakao-notify] connect failed", e);
    return back("failed");
  }
}
