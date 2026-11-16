import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { routes } from "@/shared/routes";
import { siteUrl } from "@/shared/seo";

/**
 * New-report alerts to the admin's own KakaoTalk ("나와의 채팅") via the Talk Message API
 * ("나에게 보내기"). Free; uses the existing Kakao app (KAKAO_REST_API_KEY as the OAuth client id).
 *
 * Tokens live in the singleton `kakao_notify_token` row. Access tokens last ~6h and are refreshed on
 * demand; the refresh token lasts ~2 months and Kakao only issues a new one when a refresh happens
 * with less than a month left, so the daily cron calls `keepKakaoTokenAlive()` to never let it lapse.
 *
 * Kakao Developers setup: 카카오 로그인 ON, Redirect URI `<site>/admin/kakao/callback`,
 * 동의항목 "카카오톡 메시지 전송 (talk_message)" ON. If 보안 → Client Secret is enabled, set KAKAO_CLIENT_SECRET.
 */

const KAUTH = "https://kauth.kakao.com";
const KAPI = "https://kapi.kakao.com";
const TABLE = "kakao_notify_token";
/** CSRF state cookie for the connect → callback round trip. */
export const KAKAO_STATE_COOKIE = "kakao_oauth_state";
/** Refresh the access token when it has less than this left. */
const ACCESS_MARGIN_MS = 10 * 60 * 1000;

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
};

type TokenRow = {
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
};

function clientParams() {
  const clientId = process.env.KAKAO_REST_API_KEY;
  if (!clientId) throw new Error("KAKAO_REST_API_KEY is not set");
  const params: Record<string, string> = { client_id: clientId };
  if (process.env.KAKAO_CLIENT_SECRET) params.client_secret = process.env.KAKAO_CLIENT_SECRET;
  return params;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${KAUTH}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({ ...clientParams(), ...body }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Kakao token ${res.status}: ${JSON.stringify(json)}`);
  return json as TokenResponse;
}

const inMs = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();

/* ── Connect (admin session) ───────────────────────────────────────────── */

export function kakaoAuthorizeUrl(redirectUri: string, state: string) {
  const url = new URL(`${KAUTH}/oauth/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientParams().client_id,
    redirect_uri: redirectUri,
    scope: "talk_message",
    state,
  }).toString();
  return url.toString();
}

/** Exchanges the OAuth code and stores the tokens with the admin's own session (RLS is_admin()). */
export async function connectKakao(adminSession: SupabaseClient, code: string, redirectUri: string) {
  const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  if (!t.refresh_token || !t.refresh_token_expires_in) throw new Error("Kakao returned no refresh token");
  if (t.scope && !t.scope.split(" ").includes("talk_message")) {
    throw new Error("카카오톡 메시지 전송 동의가 필요합니다.");
  }
  const { error } = await adminSession.from(TABLE).upsert({
    id: true,
    access_token: t.access_token,
    access_expires_at: inMs(t.expires_in),
    refresh_token: t.refresh_token,
    refresh_expires_at: inMs(t.refresh_token_expires_in),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  await sendToMe(t.access_token, "[분홍 맨홀] 카카오톡 알림이 연결되었습니다. 새 제보가 등록되면 여기로 알려드릴게요.", siteUrl());
}

/** For the admin header: whether alerts are connected (admin session). */
export async function getKakaoNotifyStatus(adminSession: SupabaseClient) {
  const { data } = await adminSession.from(TABLE).select("refresh_expires_at").maybeSingle();
  if (!data) return { connected: false as const };
  const expiresAt = new Date(data.refresh_expires_at as string);
  return { connected: expiresAt.getTime() > Date.now(), expiresAt };
}

/* ── Send (server, secret key) ─────────────────────────────────────────── */

/** A valid access token, refreshing (and rotating the refresh token) when needed. null = not connected. */
async function getAccessToken(admin: SupabaseClient, { force = false } = {}) {
  const { data, error } = await admin.from(TABLE).select("*").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as TokenRow;
  if (!force && new Date(row.access_expires_at).getTime() - Date.now() > ACCESS_MARGIN_MS) {
    return row.access_token;
  }
  if (new Date(row.refresh_expires_at).getTime() <= Date.now()) return null; // reconnect needed

  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: row.refresh_token });
  const patch: Partial<TokenRow> & { updated_at: string } = {
    access_token: t.access_token,
    access_expires_at: inMs(t.expires_in),
    updated_at: new Date().toISOString(),
  };
  if (t.refresh_token && t.refresh_token_expires_in) {
    patch.refresh_token = t.refresh_token;
    patch.refresh_expires_at = inMs(t.refresh_token_expires_in);
  }
  const { error: updateError } = await admin.from(TABLE).update(patch).eq("id", true);
  if (updateError) throw updateError;
  return t.access_token;
}

/** Text message (≤200 chars) to the token owner's 나와의 채팅. The link domain must be registered in the Kakao app. */
async function sendToMe(accessToken: string, text: string, link: string) {
  const template = {
    object_type: "text",
    text: text.length > 200 ? `${text.slice(0, 199)}…` : text,
    link: { web_url: link, mobile_web_url: link },
    button_title: "확인하기",
  };
  const res = await fetch(`${KAPI}/v2/api/talk/memo/default/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: new URLSearchParams({ template_object: JSON.stringify(template) }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Kakao memo send ${res.status}: ${await res.text()}`);
}

export type NewReportAlert = { id: string; reportNo: string; address: string | null; memo?: string | null };

/** Never throws: an alert failure must not affect the submission. */
export async function notifyNewReport(report: NewReportAlert) {
  try {
    const admin = createAdminClient();
    const token = await getAccessToken(admin);
    if (!token) return; // not connected (or expired): nothing to do
    const lines = [
      "[분홍 맨홀] 새 제보가 등록되었습니다.",
      `제보번호: ${report.reportNo}`,
      `위치: ${report.address ?? "주소 없음"}`,
    ];
    if (report.memo) lines.push(`메모: ${report.memo}`);
    await sendToMe(token, lines.join("\n"), `${siteUrl()}${routes.adminReport(report.id)}`);
  } catch (e) {
    console.error("[kakao-notify] new report alert failed", e);
  }
}

/** Daily cron: refresh so Kakao keeps rotating the refresh token before its ~2-month expiry. */
export async function keepKakaoTokenAlive() {
  try {
    const token = await getAccessToken(createAdminClient(), { force: true });
    return token ? "refreshed" : "not_connected";
  } catch (e) {
    console.error("[kakao-notify] token refresh failed", e);
    return "failed";
  }
}
