-- 분홍맨홀 initial schema
-- Policy: reads are public (via RLS), ALL writes go through the Next.js server
-- using the secret key. No anon/authenticated write policies exist on purpose.

create type public.report_status as enum ('received', 'reviewing', 'submitted', 'resolved', 'rejected');

-- Human-friendly lookup number, e.g. PM-261103-7K3Q (no 0/O/1/I to avoid confusion)
create or replace function public.generate_report_no()
returns text
language plpgsql
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  suffix text := '';
begin
  for i in 1..4 loop
    suffix := suffix || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return 'PM-' || to_char(now() at time zone 'Asia/Seoul', 'YYMMDD') || '-' || suffix;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── reports (public data only) ─────────────────────────────────────────────
create table public.reports (
  id             uuid primary key default gen_random_uuid(),
  report_no      text not null unique default public.generate_report_no(),
  status         public.report_status not null default 'received',
  is_hidden      boolean not null default false,
  lat            double precision not null check (lat between 33.0 and 38.7),
  lng            double precision not null check (lng between 124.5 and 132.0),
  address        text,
  road_address   text,
  sido           text,
  sigungu        text,
  memo           text check (char_length(memo) <= 200),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index reports_region_idx on public.reports (sido, sigungu, created_at desc);
create index reports_latlng_idx on public.reports (lat, lng);
create index reports_created_idx on public.reports (created_at desc);

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- ── report_photos (max 3 per report, enforced by sort_order 0..2 + unique) ──
create table public.report_photos (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid not null references public.reports (id) on delete cascade,
  storage_path  text not null,
  thumb_path    text not null,
  width         int,
  height        int,
  sort_order    smallint not null check (sort_order between 0 and 2),
  created_at    timestamptz not null default now(),
  unique (report_id, sort_order)
);

-- ── report_private (abuse prevention data — never readable by clients) ────
create table public.report_private (
  report_id        uuid primary key references public.reports (id) on delete cascade,
  ip_hash          text,
  user_agent       text,
  idempotency_key  text unique,
  created_at       timestamptz not null default now()
);

create index report_private_ip_idx on public.report_private (ip_hash, created_at desc);

-- ── report_status_history ─────────────────────────────────────────────────
create table public.report_status_history (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references public.reports (id) on delete cascade,
  from_status  public.report_status,
  to_status    public.report_status not null,
  public_note  text,
  changed_by   uuid references auth.users (id),
  created_at   timestamptz not null default now()
);

create index report_status_history_report_idx on public.report_status_history (report_id, created_at);

-- ── admin_users ───────────────────────────────────────────────────────────
create table public.admin_users (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────
alter table public.reports               enable row level security;
alter table public.report_photos         enable row level security;
alter table public.report_private        enable row level security;
alter table public.report_status_history enable row level security;
alter table public.admin_users           enable row level security;

create policy "public can read visible reports"
  on public.reports for select
  to anon, authenticated
  using (is_hidden = false);

create policy "public can read photos of visible reports"
  on public.report_photos for select
  to anon, authenticated
  using (exists (
    select 1 from public.reports r where r.id = report_id and r.is_hidden = false
  ));

create policy "public can read history of visible reports"
  on public.report_status_history for select
  to anon, authenticated
  using (exists (
    select 1 from public.reports r where r.id = report_id and r.is_hidden = false
  ));

-- Hide the admin uid column from public readers.
revoke select on public.report_status_history from anon, authenticated;
grant select (id, report_id, from_status, to_status, public_note, created_at)
  on public.report_status_history to anon, authenticated;

-- report_private / admin_users: RLS on, no policies → secret key only.

-- ── Storage ───────────────────────────────────────────────────────────────
-- Public-read bucket; uploads only via server-issued signed upload URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', true, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;
