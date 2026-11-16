-- KakaoTalk "나에게 보내기" new-report alerts for the (single) admin.
-- One row holds the admin's Kakao OAuth tokens (scope: talk_message).
--  - The admin connects from /admin/kakao/connect; the callback upserts the row with the admin's
--    own session (RLS is_admin()).
--  - The server (service_role) reads it to send alerts and rotates the access/refresh tokens
--    (POST /api/reports, daily cron).
create table public.kakao_notify_token (
  id                  boolean primary key default true check (id),   -- singleton row
  access_token        text not null,
  access_expires_at   timestamptz not null,
  refresh_token       text not null,
  refresh_expires_at  timestamptz not null,
  updated_at          timestamptz not null default now()
);
alter table public.kakao_notify_token enable row level security;
revoke all on public.kakao_notify_token from anon;

create policy kakao_notify_token_admin_all on public.kakao_notify_token
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
