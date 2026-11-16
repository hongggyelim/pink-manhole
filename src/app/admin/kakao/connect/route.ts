import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext } from "@/server/auth";
import { KAKAO_STATE_COOKIE, kakaoAuthorizeUrl } from "@/server/services/kakao-notify";
import { Route } from "@/shared/routes";

/** GET /admin/kakao/connect → Kakao consent (talk_message) → /admin/kakao/callback. Admin only. */
export async function GET(req: NextRequest) {
  const ctx = await getAdminContext();
  if (ctx.state !== "admin") {
    return NextResponse.redirect(new URL(ctx.state === "anon" ? Route.AdminLogin : Route.AdminForbidden, req.url));
  }
  const state = crypto.randomUUID();
  const redirectUri = new URL(Route.AdminKakaoCallback, req.nextUrl.origin).toString();
  const res = NextResponse.redirect(kakaoAuthorizeUrl(redirectUri, state));
  res.cookies.set(KAKAO_STATE_COOKIE, state, {
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: Route.AdminKakaoCallback,
    maxAge: 600,
  });
  return res;
}
