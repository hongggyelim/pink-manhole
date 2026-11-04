import Link from "next/link";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { FilterBar } from "@/features/admin/filter-bar";
import { AdminReportList } from "@/features/admin/report-list";
import { requireAdminPage } from "@/server/auth";
import {
  ADMIN_PAGE_SIZE, getAdminPhotoUrls, getAdminStats, listAdminReports, parseAdminFilters,
  type AdminListFilters, type AdminView,
} from "@/server/services/admin";
import { Route, withQuery } from "@/shared/routes";

export const metadata = { title: "제보 목록" };

type SP = PageProps<"/admin">["searchParams"];
const VIEWS: { key: AdminView; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "public", label: "공개" },
  { key: "hidden", label: "비공개" },
  { key: "deleted", label: "삭제" },
];

/** Current filters + overrides as query params; defaults (view=all, page=1) are omitted. */
function filterParams(f: AdminListFilters, patch: Partial<Record<keyof AdminListFilters, string | number | undefined>> = {}) {
  const merged = { ...f, ...patch };
  return {
    view: merged.view === "all" ? undefined : merged.view,
    q: merged.q,
    sido: merged.sido,
    status: merged.status,
    page: merged.page === 1 ? undefined : merged.page,
  };
}

export default function AdminHome({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <Suspense fallback={<div className="h-24" />}>
        <Stats />
      </Suspense>
      <Suspense fallback={<p className="mt-6 text-sm text-muted-foreground">불러오는 중…</p>}>
        <ReportList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Stats() {
  const { supabase } = await requireAdminPage();
  const s = await getAdminStats(supabase);
  const cards = [
    { label: "전체 제보", value: s.total, href: Route.Admin },
    { label: "사진 검토 대기", value: s.pendingPhotos, href: Route.AdminPhotos, accent: s.pendingPhotos > 0 },
    { label: "검토중 제보", value: s.reviewing, href: withQuery(Route.Admin, { status: "reviewing" }) },
    { label: "민원 접수", value: s.submitted, href: withQuery(Route.Admin, { status: "submitted" }) },
    { label: "비공개", value: s.hidden, href: withQuery(Route.Admin, { view: "hidden" }) },
    { label: "삭제", value: s.deleted, href: withQuery(Route.Admin, { view: "deleted" }) },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
      {cards.map((c) => (
        <Link key={c.label} href={c.href} className={cn("rounded-xl border bg-white p-3 sm:p-4", c.accent && "border-primary")}>
          <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{c.label}</p>
          <p className={cn("mt-1 text-xl font-bold tabular-nums sm:text-2xl", c.accent && "text-primary")}>
            {c.value.toLocaleString()}
          </p>
        </Link>
      ))}
    </div>
  );
}

async function ReportList({ searchParams }: { searchParams: SP }) {
  const f = parseAdminFilters(await searchParams);
  const { supabase } = await requireAdminPage();
  const { reports, count } = await listAdminReports(supabase, f);
  const urls = await getAdminPhotoUrls(
    supabase,
    reports.flatMap((r) => (r.report_photos[0] ? [{ photo: r.report_photos[0], visible: !r.is_hidden && !r.deleted_at }] : [])),
  );
  const pages = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));
  const thumbs = Object.fromEntries(
    reports.map((r) => [r.id, r.report_photos[0] ? urls[r.report_photos[0].id]?.thumb : undefined]),
  );

  return (
    <section className="mt-6">
      <nav className="flex w-full rounded-lg border bg-white p-1 sm:w-fit">
        {VIEWS.map((v) => (
          <Link key={v.key} href={withQuery(Route.Admin, filterParams(f, { view: v.key, page: 1 }))}
            className={cn("flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium sm:flex-none",
              f.view === v.key ? "bg-navy text-white" : "text-muted-foreground hover:bg-muted")}>
            {v.label}
          </Link>
        ))}
      </nav>

      {/* key: remount when the URL changes so the search box reflects it */}
      <FilterBar key={withQuery(Route.Admin, filterParams(f, { page: undefined }))} filters={f} />

      {/* key: reset the selection whenever the list (filters/page) changes */}
      <AdminReportList
        key={withQuery(Route.Admin, filterParams(f))}
        reports={reports}
        thumbs={thumbs}
        count={count}
        exportHref={withQuery(Route.AdminExport, filterParams(f, { page: undefined }))}
        deletedView={f.view === "deleted"}
      />

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {f.page > 1 && <Link href={withQuery(Route.Admin, filterParams(f, { page: f.page - 1 }))} className="rounded-lg border bg-white px-3 py-1.5">이전</Link>}
          <span className="tabular-nums">{f.page} / {pages}</span>
          {f.page < pages && <Link href={withQuery(Route.Admin, filterParams(f, { page: f.page + 1 }))} className="rounded-lg border bg-white px-3 py-1.5">다음</Link>}
        </div>
      )}
    </section>
  );
}
