-- Admin dashboard + photo moderation
--
-- Policy:
--   * Reports are public immediately (location/address/status), photos are shown
--     BLURRED until an admin approves each one.
--   * Visible statuses: reviewing(검토중) → registered(등록) → submitted(민원 접수).
--   * is_hidden (비공개) and deleted_at (삭제) remove a report from public view entirely.
--   * Files: originals live in the PRIVATE bucket `report-uploads`. The public bucket
--     `report-photos` only ever holds files that may be shown (blur previews of pending
--     photos, approved photos). The server moves files between buckets.
--   * Exactly one admin: `admin_users` allows a single row, and auth.users accepts a
--     single account (sign-up is closed at the DB level as well as in Auth settings).

-- ── 1. Status enum: 5 values → 3 values ───────────────────────────────────
drop table public.report_status_history;   -- replaced by admin_activity_logs (unused in UI)

alter table public.reports alter column status drop default;
create type public.report_status_v2 as enum ('reviewing', 'registered', 'submitted');
alter table public.reports
  alter column status type public.report_status_v2
  using (case status::text
           when 'submitted' then 'submitted'
           when 'resolved'  then 'submitted'
           when 'received'  then 'reviewing'
           when 'reviewing' then 'reviewing'
           else 'reviewing'
         end)::public.report_status_v2;
drop type public.report_status;
alter type public.report_status_v2 rename to report_status;
alter table public.reports alter column status set default 'reviewing';

-- ── 2. Soft delete + photo moderation ─────────────────────────────────────
alter table public.reports add column deleted_at timestamptz;
create index reports_admin_idx on public.reports (deleted_at, is_hidden, status, created_at desc);

create type public.photo_moderation as enum ('pending', 'approved', 'private');
alter table public.report_photos
  add column blur_path text,
  add column moderation_status public.photo_moderation not null default 'pending',
  add column moderated_at timestamptz;
create index report_photos_pending_idx on public.report_photos (moderation_status, created_at);

-- ── 3. Single admin ───────────────────────────────────────────────────────
create unique index admin_users_single_row on public.admin_users ((true));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Only one account may exist in auth.users (the admin). Blocks any sign-up path.
create or replace function public.enforce_single_auth_user()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if exists (select 1 from auth.users) then
    raise exception 'Sign-up is disabled';
  end if;
  return new;
end;
$$;
create trigger enforce_single_auth_user
  before insert on auth.users
  for each row execute function public.enforce_single_auth_user();

-- ── 4. Activity log ───────────────────────────────────────────────────────
create table public.admin_activity_logs (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null default auth.uid() references auth.users (id),
  report_id   uuid not null references public.reports (id) on delete cascade,
  photo_id    uuid references public.report_photos (id) on delete set null,
  action      text not null check (action in ('status', 'visibility', 'delete', 'restore', 'photo')),
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);
create index admin_activity_logs_report_idx on public.admin_activity_logs (report_id, created_at desc);
alter table public.admin_activity_logs enable row level security;

-- ── 5. RLS ────────────────────────────────────────────────────────────────
drop policy "public can read visible reports" on public.reports;
drop policy "public can read photos of visible reports" on public.report_photos;

create policy "public reads visible reports"
  on public.reports for select to anon, authenticated
  using (is_hidden = false and deleted_at is null);

create policy "admin reads all reports"
  on public.reports for select to authenticated
  using (public.is_admin());

create policy "admin updates reports"
  on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "public reads non-private photos of visible reports"
  on public.report_photos for select to anon, authenticated
  using (
    moderation_status <> 'private'
    and exists (select 1 from public.reports r
                where r.id = report_id and r.is_hidden = false and r.deleted_at is null)
  );

create policy "admin reads all photos"
  on public.report_photos for select to authenticated
  using (public.is_admin());

create policy "admin updates photos"
  on public.report_photos for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "admin reads logs"
  on public.admin_activity_logs for select to authenticated
  using (public.is_admin());

create policy "admin writes logs"
  on public.admin_activity_logs for insert to authenticated
  with check (public.is_admin() and admin_id = auth.uid());

-- ── 6. Storage ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-uploads', 'report-uploads', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Admin may read/move/delete files in both buckets (anon/public: no write access anywhere;
-- public bucket files are served by public URL without needing a select policy).
create policy "admin manages report files"
  on storage.objects for all to authenticated
  using (bucket_id in ('report-uploads', 'report-photos') and public.is_admin())
  with check (bucket_id in ('report-uploads', 'report-photos') and public.is_admin());

-- ── 7. Report creation (server only) ──────────────────────────────────────
drop function public.create_report(uuid, double precision, double precision, text, text, text, text, jsonb, text, text);

create function public.create_report(
  p_id            uuid,
  p_lat           double precision,
  p_lng           double precision,
  p_address       text,
  p_road_address  text,
  p_sido          text,
  p_sigungu       text,
  p_photos        jsonb,   -- [{storage_path, thumb_path, blur_path, width, height}]
  p_ip_hash       text,
  p_user_agent    text
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_no text;
  v_photo jsonb;
  v_idx int := 0;
begin
  select report_no into v_no from reports where id = p_id;
  if found then
    return v_no;
  end if;

  if jsonb_array_length(p_photos) < 1 or jsonb_array_length(p_photos) > 3 then
    raise exception 'photo count must be 1..3';
  end if;

  for attempt in 1..5 loop
    begin
      insert into reports (id, lat, lng, address, road_address, sido, sigungu)
      values (p_id, p_lat, p_lng, p_address, p_road_address, p_sido, p_sigungu)
      returning report_no into v_no;
      exit;
    exception when unique_violation then
      if attempt = 5 then raise; end if;
    end;
  end loop;

  for v_photo in select * from jsonb_array_elements(p_photos) loop
    insert into report_photos (report_id, storage_path, thumb_path, blur_path, width, height, sort_order)
    values (
      p_id,
      v_photo->>'storage_path',
      v_photo->>'thumb_path',
      v_photo->>'blur_path',
      nullif(v_photo->>'width', '')::int,
      nullif(v_photo->>'height', '')::int,
      v_idx
    );
    v_idx := v_idx + 1;
  end loop;

  insert into report_private (report_id, ip_hash, user_agent, idempotency_key)
  values (p_id, p_ip_hash, left(p_user_agent, 300), p_id::text);

  return v_no;
end;
$$;

revoke execute on function public.create_report(uuid, double precision, double precision, text, text, text, text, jsonb, text, text)
  from public, anon, authenticated;
grant execute on function public.create_report(uuid, double precision, double precision, text, text, text, text, jsonb, text, text)
  to service_role;

-- ── 8. Admin mutations (SECURITY INVOKER: RLS applies; mutation + log are atomic) ──

create function public.admin_moderate_photo(p_photo_id uuid, p_decision public.photo_moderation)
returns uuid   -- report_id
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_photo report_photos%rowtype;
  v_status report_status;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_decision = 'pending' then raise exception 'invalid decision'; end if;

  select * into v_photo from report_photos where id = p_photo_id for update;
  if not found then raise exception 'photo not found'; end if;

  update report_photos set moderation_status = p_decision, moderated_at = now() where id = p_photo_id;
  insert into admin_activity_logs (report_id, photo_id, action, before, after)
  values (v_photo.report_id, p_photo_id, 'photo',
          jsonb_build_object('moderation', v_photo.moderation_status),
          jsonb_build_object('moderation', p_decision));

  -- Once no photo is pending, a report under review becomes "registered".
  select status into v_status from reports where id = v_photo.report_id for update;
  if v_status = 'reviewing' and not exists (
       select 1 from report_photos where report_id = v_photo.report_id and moderation_status = 'pending') then
    update reports set status = 'registered' where id = v_photo.report_id;
    insert into admin_activity_logs (report_id, action, before, after)
    values (v_photo.report_id, 'status', jsonb_build_object('status', v_status),
            jsonb_build_object('status', 'registered', 'auto', true));
  end if;

  return v_photo.report_id;
end;
$$;

create function public.admin_set_status(p_report_id uuid, p_status public.report_status)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare v_old report_status;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select status into v_old from reports where id = p_report_id for update;
  if not found then raise exception 'report not found'; end if;
  if v_old = p_status then return; end if;
  update reports set status = p_status where id = p_report_id;
  insert into admin_activity_logs (report_id, action, before, after)
  values (p_report_id, 'status', jsonb_build_object('status', v_old), jsonb_build_object('status', p_status));
end;
$$;

create function public.admin_set_hidden(p_report_id uuid, p_hidden boolean)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare v_old boolean;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select is_hidden into v_old from reports where id = p_report_id for update;
  if not found then raise exception 'report not found'; end if;
  if v_old = p_hidden then return; end if;
  update reports set is_hidden = p_hidden where id = p_report_id;
  insert into admin_activity_logs (report_id, action, before, after)
  values (p_report_id, 'visibility', jsonb_build_object('hidden', v_old), jsonb_build_object('hidden', p_hidden));
end;
$$;

create function public.admin_set_deleted(p_report_id uuid, p_deleted boolean)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare v_old timestamptz;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select deleted_at into v_old from reports where id = p_report_id for update;
  if not found then raise exception 'report not found'; end if;
  if (v_old is not null) = p_deleted then return; end if;
  update reports set deleted_at = case when p_deleted then now() else null end where id = p_report_id;
  insert into admin_activity_logs (report_id, action, before, after)
  values (p_report_id, case when p_deleted then 'delete' else 'restore' end,
          jsonb_build_object('deleted_at', v_old),
          jsonb_build_object('deleted', p_deleted));
end;
$$;

revoke execute on function public.admin_moderate_photo(uuid, public.photo_moderation) from public, anon;
revoke execute on function public.admin_set_status(uuid, public.report_status) from public, anon;
revoke execute on function public.admin_set_hidden(uuid, boolean) from public, anon;
revoke execute on function public.admin_set_deleted(uuid, boolean) from public, anon;
grant execute on function public.admin_moderate_photo(uuid, public.photo_moderation) to authenticated;
grant execute on function public.admin_set_status(uuid, public.report_status) to authenticated;
grant execute on function public.admin_set_hidden(uuid, boolean) to authenticated;
grant execute on function public.admin_set_deleted(uuid, boolean) to authenticated;
