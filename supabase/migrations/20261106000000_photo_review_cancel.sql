-- Photo review cancel + report-level photo moderation (admin list, single and bulk).
--  1. admin_moderate_photo accepts 'pending' (= 검토 취소). Setting the current value is a no-op
--     (no log). The automatic status follows both ways: reviewing → registered when no photo is
--     pending any more, and registered → reviewing when a photo is pending again.
--     'submitted' is never changed automatically.
--  2. admin_moderate_report_photos(report, decision): applies a decision to every photo of a report
--     that it makes sense for (approve/private → pending photos, pending → reviewed photos), one
--     admin_moderate_photo call (and activity log) per photo, in one transaction.

create or replace function public.admin_moderate_photo(p_photo_id uuid, p_decision public.photo_moderation)
returns uuid   -- report_id
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_photo report_photos%rowtype;
  v_status report_status;
  v_has_pending boolean;
  v_next report_status;
begin
  if not is_admin() then raise exception 'forbidden'; end if;

  select * into v_photo from report_photos where id = p_photo_id for update;
  if not found then raise exception 'photo not found'; end if;
  if v_photo.moderation_status = p_decision then return v_photo.report_id; end if;

  update report_photos
  set moderation_status = p_decision,
      moderated_at = case when p_decision = 'pending' then null else now() end
  where id = p_photo_id;
  insert into admin_activity_logs (report_id, photo_id, action, before, after)
  values (v_photo.report_id, p_photo_id, 'photo',
          jsonb_build_object('moderation', v_photo.moderation_status),
          jsonb_build_object('moderation', p_decision));

  select status into v_status from reports where id = v_photo.report_id for update;
  select exists (select 1 from report_photos where report_id = v_photo.report_id and moderation_status = 'pending')
    into v_has_pending;
  v_next := case
    when v_status = 'reviewing' and not v_has_pending then 'registered'
    when v_status = 'registered' and v_has_pending then 'reviewing'
    else v_status
  end;
  if v_next <> v_status then
    update reports set status = v_next where id = v_photo.report_id;
    insert into admin_activity_logs (report_id, action, before, after)
    values (v_photo.report_id, 'status', jsonb_build_object('status', v_status),
            jsonb_build_object('status', v_next, 'auto', true));
  end if;

  return v_photo.report_id;
end;
$$;

create function public.admin_moderate_report_photos(p_report_id uuid, p_decision public.photo_moderation)
returns int   -- photos changed
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_photo_id uuid;
  v_count int := 0;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  perform 1 from reports where id = p_report_id for update;
  if not found then raise exception 'report not found'; end if;

  for v_photo_id in
    select id from report_photos
    where report_id = p_report_id
      and case when p_decision = 'pending' then moderation_status <> 'pending'
               else moderation_status = 'pending' end
    order by sort_order
  loop
    perform admin_moderate_photo(v_photo_id, p_decision);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.admin_moderate_report_photos(uuid, public.photo_moderation) from public, anon;
grant execute on function public.admin_moderate_report_photos(uuid, public.photo_moderation) to authenticated;
