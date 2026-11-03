-- Atomic report creation. Called only by the Next.js server (secret key / service_role).
-- p_id doubles as the idempotency key: retrying the same draft returns the same report_no.
create or replace function public.create_report(
  p_id            uuid,
  p_lat           double precision,
  p_lng           double precision,
  p_address       text,
  p_road_address  text,
  p_sido          text,
  p_sigungu       text,
  p_photos        jsonb,   -- [{storage_path, thumb_path, width, height}]
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

  -- Retry on the (rare) report_no collision.
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
    insert into report_photos (report_id, storage_path, thumb_path, width, height, sort_order)
    values (
      p_id,
      v_photo->>'storage_path',
      v_photo->>'thumb_path',
      nullif(v_photo->>'width', '')::int,
      nullif(v_photo->>'height', '')::int,
      v_idx
    );
    v_idx := v_idx + 1;
  end loop;

  insert into report_private (report_id, ip_hash, user_agent, idempotency_key)
  values (p_id, p_ip_hash, left(p_user_agent, 300), p_id::text);

  insert into report_status_history (report_id, from_status, to_status)
  values (p_id, null, 'received');

  return v_no;
end;
$$;

revoke execute on function public.create_report(uuid, double precision, double precision, text, text, text, text, jsonb, text, text)
  from public, anon, authenticated;
grant execute on function public.create_report(uuid, double precision, double precision, text, text, text, text, jsonb, text, text)
  to service_role;

-- Abuse check helper: reports from one IP hash within a window (server only).
create or replace function public.count_recent_reports(p_ip_hash text, p_minutes int)
returns int
language sql
stable
set search_path = public
as $$
  select count(*)::int from report_private
  where ip_hash = p_ip_hash and created_at > now() - make_interval(mins => p_minutes);
$$;

revoke execute on function public.count_recent_reports(text, int) from public, anon, authenticated;
grant execute on function public.count_recent_reports(text, int) to service_role;
