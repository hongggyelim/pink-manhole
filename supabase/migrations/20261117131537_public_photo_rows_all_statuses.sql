-- Public pages now show a placeholder tile for every photo that is not approved (pending or
-- private), so the public needs to see that those photo rows exist. Only the rows become
-- readable: files of pending/private photos stay in the private `report-uploads` bucket
-- (syncReportFiles), so their paths lead nowhere publicly. Originals are never deleted, which
-- keeps 공개 ↔ 비공개 switchable at any time.
drop policy "public reads non-private photos of visible reports" on public.report_photos;

create policy "public reads photo rows of visible reports"
  on public.report_photos for select to anon, authenticated
  using (
    exists (select 1 from public.reports r
            where r.id = report_id and r.is_hidden = false and r.deleted_at is null)
  );
