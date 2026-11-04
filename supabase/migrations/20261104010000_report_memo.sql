-- Optional location memo on report creation (reports.memo already exists, ≤200 chars).
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
  p_user_agent    text,
  p_memo          text default null
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
      insert into reports (id, lat, lng, address, road_address, sido, sigungu, memo)
      values (p_id, p_lat, p_lng, p_address, p_road_address, p_sido, p_sigungu, nullif(btrim(p_memo), ''))
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

revoke execute on function public.create_report(uuid, double precision, double precision, text, text, text, text, jsonb, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_report(uuid, double precision, double precision, text, text, text, text, jsonb, text, text, text)
  to service_role;
