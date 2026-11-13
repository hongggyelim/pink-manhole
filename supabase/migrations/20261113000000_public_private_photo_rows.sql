-- Private photos are now shown to the public as a black manhole placeholder, so the public
-- needs to know they exist (row + moderation_status). Only the row becomes readable: the
-- files of private photos stay in the private `report-uploads` bucket.
drop policy "public reads non-private photos of visible reports" on public.report_photos;

create policy "public reads photos of visible reports"
  on public.report_photos for select to anon, authenticated
  using (
    exists (select 1 from public.reports r
            where r.id = report_id and r.is_hidden = false and r.deleted_at is null)
  );
