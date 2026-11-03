import { Download } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { requireAdminPage } from "@/server/auth";
import {
  ADMIN_PAGE_SIZE, getAdminPhotoUrls, getAdminStats, listAdminReports, parseAdminFilters,
  type AdminListFilters, type AdminView,
} from "@/server/services/admin";
import { REPORT_STATUSES, SIDO_LIST } from "@/shared/constants";
import { formatDate } from "@/shared/format";
import type { AdminReport } from "@/shared/types";

export const metadata = { title: "제보 목록" };

type SP = PageProps<"/admin">["searchParams"];
const VIEWS: { key: AdminView; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "public", label: "공개" },
  { key: "hidden", label: "비공개" },
  { key: "deleted", label: "삭제" },
];

function query(f: AdminListFilters, patch: Partial<Record<keyof AdminListFilters, string | number | undefined>> = {}) {
  const merged = { ...f, ...patch } as Record<string, string | number | undefined>;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === "" || (k === "view" && v === "all") || (k === "page" && v === 1)) continue;
    p.set(k, String(v));
  }
  return p.size ? `?${p}` : "";
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
    { label: "전체 제보", value: s.total, href: "/admin" },
    { label: "사진 검토 대기", value: s.pendingPhotos, href: "/admin/photos", accent: s.pendingPhotos > 0 },
    { label: "검토중 제보", value: s.reviewing, href: "/admin?status=reviewing" },
    { label: "민원 접수", value: s.submitted, href: "/admin?status=submitted" },
    { label: "비공개", value: s.hidden, href: "/admin?view=hidden" },
    { label: "삭제", value: s.deleted, href: "/admin?view=deleted" },
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

function Visibility({ r }: { r: AdminReport }) {
  if (r.deleted_at) return <span className="text-xs text-destructive">삭제됨</span>;
  if (r.is_hidden) return <span className="text-xs font-semibold">비공개</span>;
  return <span className="text-xs text-emerald-700">공개</span>;
}

function PendingPhotos({ r }: { r: AdminReport }) {
  const pending = r.report_photos.filter((p) => p.moderation_status === "pending").length;
  return pending > 0
    ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">사진 대기 {pending}</span>
    : <span className="text-xs text-muted-foreground">검토 완료</span>;
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
  const thumb = (r: AdminReport) => {
    const first = r.report_photos[0];
    return first && urls[first.id]?.thumb ? <img src={urls[first.id].thumb} alt="" className="size-full object-cover" /> : null;
  };

  return (
    <section className="mt-6">
      <nav className="flex w-full rounded-lg border bg-white p-1 sm:w-fit">
        {VIEWS.map((v) => (
          <Link key={v.key} href={`/admin${query(f, { view: v.key, page: 1 })}`}
            className={cn("flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium sm:flex-none",
              f.view === v.key ? "bg-navy text-white" : "text-muted-foreground hover:bg-muted")}>
            {v.label}
          </Link>
        ))}
      </nav>

      <form action="/admin" className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        {f.view !== "all" && <input type="hidden" name="view" value={f.view} />}
        <input name="q" defaultValue={f.q} placeholder="주소·조회번호·시군구 검색"
          className="col-span-2 h-10 rounded-lg border bg-white px-3 text-base outline-none focus:border-primary sm:min-w-56 sm:flex-1 sm:text-sm" />
        <select name="sido" defaultValue={f.sido ?? ""} className="h-10 rounded-lg border bg-white px-2 text-sm">
          <option value="">전체 지역</option>
          {SIDO_LIST.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <select name="status" defaultValue={f.status ?? ""} className="h-10 rounded-lg border bg-white px-2 text-sm">
          <option value="">전체 상태</option>
          {Object.entries(REPORT_STATUSES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <button className="col-span-2 h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white sm:col-span-1">검색</button>
        {(f.q || f.sido || f.status) && (
          <Link href={`/admin${query(f, { q: undefined, sido: undefined, status: undefined, page: 1 })}`}
            className="col-span-2 text-center text-sm text-muted-foreground underline sm:col-span-1">
            초기화
          </Link>
        )}
      </form>

      <div className="mt-4 mb-2 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{count.toLocaleString()}건</p>
        <a
          href={`/admin/export${query(f, { page: undefined })}`}
          download
          aria-disabled={count === 0}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-medium hover:bg-muted",
            count === 0 && "pointer-events-none opacity-50",
          )}
        >
          <Download className="size-4" /> 엑셀 다운로드
        </a>
      </div>

      {reports.length === 0 && (
        <p className="rounded-xl border bg-white p-10 text-center text-muted-foreground">조건에 맞는 제보가 없어요.</p>
      )}

      {/* Mobile: cards */}
      <ul className="space-y-2 md:hidden">
        {reports.map((r) => (
          <li key={r.id}>
            <Link href={`/admin/reports/${r.id}`} className="flex gap-3 rounded-xl border bg-white p-3">
              <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">{thumb(r)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold">{r.report_no}</span>
                  <Visibility r={r} />
                </div>
                <p className="mt-0.5 truncate text-sm">{r.road_address ?? r.address ?? "주소 없음"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{REPORT_STATUSES[r.status]}</span>
                  <PendingPhotos r={r} />
                  <span>{formatDate(r.created_at)}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      {reports.length > 0 && (
        <div className="hidden overflow-x-auto rounded-xl border bg-white md:block">
          <table className="w-full text-sm">
            <thead className="border-b bg-neutral-50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">사진</th><th className="p-3">조회번호</th><th className="p-3">주소</th>
                <th className="p-3">상태</th><th className="p-3">사진 검토</th><th className="p-3">공개</th><th className="p-3">등록일</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reports.map((r) => {
                const link = `/admin/reports/${r.id}`;
                return (
                  <tr key={r.id} className="hover:bg-neutral-50">
                    <td className="p-2">
                      <Link href={link} className="block size-12 overflow-hidden rounded-lg bg-muted">{thumb(r)}</Link>
                    </td>
                    <td className="p-3 font-mono"><Link href={link} className="hover:underline">{r.report_no}</Link></td>
                    <td className="max-w-72 p-3">
                      <Link href={link} className="block truncate hover:underline">{r.road_address ?? r.address ?? "주소 없음"}</Link>
                      <span className="text-xs text-muted-foreground">{[r.sido, r.sigungu].filter(Boolean).join(" ")}</span>
                    </td>
                    <td className="p-3">{REPORT_STATUSES[r.status]}</td>
                    <td className="p-3"><PendingPhotos r={r} /></td>
                    <td className="p-3"><Visibility r={r} /></td>
                    <td className="p-3 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {f.page > 1 && <Link href={`/admin${query(f, { page: f.page - 1 })}`} className="rounded-lg border bg-white px-3 py-1.5">이전</Link>}
          <span className="tabular-nums">{f.page} / {pages}</span>
          {f.page < pages && <Link href={`/admin${query(f, { page: f.page + 1 })}`} className="rounded-lg border bg-white px-3 py-1.5">다음</Link>}
        </div>
      )}
    </section>
  );
}
