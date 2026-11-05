-- Security hardening
--  1. Generic per-key rate limiter (upload URLs, geocode, admin login) — server (service_role) only.
--  2. Private upload bucket: 3MB per file (the client always uploads ≤2MB JPEGs), so one signed
--     draft can no longer push 3×10MB.
--  3. Retention helper for the daily cleanup job (rate-limit hits, 90-day IP hash / UA wipe).

-- ── 1. Rate limiter ───────────────────────────────────────────────────────
create table public.rate_limit_hits (
  id          bigint generated always as identity primary key,
  scope       text not null,          -- 'upload' | 'geocode' | 'login'
  key_hash    text not null,          -- salted IP hash
  created_at  timestamptz not null default now()
);
create index rate_limit_hits_lookup_idx on public.rate_limit_hits (scope, key_hash, created_at desc);
alter table public.rate_limit_hits enable row level security;   -- no policies: clients get nothing
revoke all on public.rate_limit_hits from anon, authenticated;

-- Atomically: if the key already has p_max hits inside the window → true (limited, nothing recorded);
-- otherwise record one hit → false. The advisory lock serialises concurrent calls for the same key.
create function public.hit_rate_limit(p_scope text, p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  perform pg_advisory_xact_lock(hashtext(p_scope || ':' || p_key));
  select count(*) into v_count
  from rate_limit_hits
  where scope = p_scope and key_hash = p_key
    and created_at > now() - make_interval(secs => p_window_seconds);
  if v_count >= p_max then
    return true;
  end if;
  insert into rate_limit_hits (scope, key_hash) values (p_scope, p_key);
  return false;
end;
$$;
revoke execute on function public.hit_rate_limit(text, text, int, int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, text, int, int) to service_role;

-- ── 2. Upload size ────────────────────────────────────────────────────────
update storage.buckets set file_size_limit = 3145728 where id = 'report-uploads';

-- ── 3. Retention (called by the daily cron) ───────────────────────────────
create function public.purge_expired_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_hits int; v_private int;
begin
  delete from rate_limit_hits where created_at < now() - interval '2 days';
  get diagnostics v_hits = row_count;
  -- Privacy policy: abuse-prevention data (IP hash, User-Agent) is deleted after 90 days.
  update report_private set ip_hash = null, user_agent = null
  where created_at < now() - interval '90 days' and (ip_hash is not null or user_agent is not null);
  get diagnostics v_private = row_count;
  return jsonb_build_object('rate_limit_hits', v_hits, 'report_private_wiped', v_private);
end;
$$;
revoke execute on function public.purge_expired_data() from public, anon, authenticated;
grant execute on function public.purge_expired_data() to service_role;
