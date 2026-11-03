import Link from "next/link";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { requireAdminPage } from "@/server/auth";
import {
  ADMIN_PAGE_SIZE, getAdminPhotoUrls, getAdminStats, listAdminReports, type AdminView,
} from "@/server/services/admin";
import { REPORT_STATUSES, SIDO_LIST, type ReportStatus } from "@/shared/constants";
import { formatDate } from "@/shared/format";

export const metadata = { title: "제보 목록" };

type SP = PageProps<"/admin">["searchParams"];
const VIEWS: { key: AdminView; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "public", label: "공개" },
  { key: "hidden", label: "비공개" },
  { key: "deleted", label: "삭제" },
];

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

async function readFilters(searchParams: SP) {
  const sp = await searchParams;
  const view = VIEWS.some((v) => v.key === sp.view) ? (sp.view as AdminView) : "all";
  const status = str(sp.status) && str(sp.status)! in REPORT_STATUSES ? (sp.status as ReportStatus) : undefined;
  const sido = SIDO_LIST.some((s) => s.name === sp.sido) ? str(sp.sido) : undefined;
  const page = Math.max(1, Number(str(sp.page)) || 1);
  return { view, status, sido, q: str(sp.q)?.trim() || undefined, page };
}

function href(f: Awaited<ReturnType<typeof readFilters>>, patch: Record<string, string | number | undefined>) {
  const merged = { ...f, ...patch } as Record<string, string | number | undefined>;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === "" || (k === "view" && v === "all") || (k === "page" && v === 1)) continue;
    p.set(k, String(v));
  }
  return p.size ? `/admin?${p}` : "/admin";
}

export default function AdminHome({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <Suspense fallback={<div className="h-24" />}>
        <Stats />
      </Suspense>
      <Suspense fallback={<p className="mt-6 text-sm text-muted-foreground">불러오는 중…</p>}>
        <ReportTable searchParams={searchParams} />
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <Link key={c.label} href={c.href} className={cn("rounded-xl border bg-white p-4", c.accent && "border-primary")}>
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className={cn("mt-1 text-2xl font-bold tabular-nums", c.accent && "text-primary")}>{c.value.toLocaleString()}</p>
        </Link>
      ))}
    </div>
  );
}

async function ReportTable({ searchParams }: { searchParams: SP }) {
  const f = await readFilters(searchParams);
  const { supabase } = await requireAdminPage();
  const { reports, count } = await listAdminReports(supabase, f);
  const urls = await getAdminPhotoUrls(
    supabase,
    reports.flatMap((r) => (r.report_photos[0] ? [{ photo: r.report_photos[0], visible: !r.is_hidden && !r.deleted_at }] : [])),
  );
  const pages = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <nav className="flex rounded-lg border bg-white p-1">
          {VIEWS.map((v) => (
            <Link key={v.key} href={href(f, { view: v.key, page: 1 })}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium",
                f.view === v.key ? "bg-navy text-white" : "text-muted-foreground hover:bg-muted")}>
              {v.label}
            </Link>
          ))}
        </nav>
        <form action="/admin" className="flex flex-1 flex-wrap items-center gap-2">
          {f.view !== "all" && <input type="hidden" name="view" value={f.view} />}
          <input name="q" defaultValue={f.q} placeholder="주소·조회번호·시군구 검색"
            className="h-10 min-w-48 flex-1 rounded-lg border bg-white px-3 text-sm outline-none focus:border-primary" />
          <select name="sido" defaultValue={f.sido ?? ""} className="h-10 rounded-lg border bg-white px-2 text-sm">
            <option value="">전체 지역</option>
            {SIDO_LIST.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
          <select name="status" defaultValue={f.status ?? ""} className="h-10 rounded-lg border bg-white px-2 text-sm">
            <option value="">전체 상태</option>
            {Object.entries(REPORT_STATUSES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white">검색</button>
          {(f.q || f.sido || f.status) && (
            <Link href={href(f, { q: undefined, sido: undefined, status: undefined, page: 1 })} className="text-sm text-muted-foreground underline">
              초기화
            </Link>
          )}
        </form>
      </div>

      <p className="mt-4 mb-2 text-sm text-muted-foreground">{count.toLocaleString()}건</p>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b bg-neutral-50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">사진</th><th className="p-3">조회번호</th><th className="p-3">주소</th>
              <th className="p-3">상태</th><th className="p-3">사진 검토</th><th className="p-3">공개</th><th className="p-3">등록일</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reports.length === 0 && (
              <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">조건에 맞는 제보가 없어요.</td></tr>
            )}
            {reports.map((r) => {
              const first = r.report_photos[0];
              const pending = r.report_photos.filter((p) => p.moderation_status === "pending").length;
              const link = `/admin/reports/${r.id}`;
              return (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="p-2">
                    <Link href={link} className="block size-12 overflow-hidden rounded-lg bg-muted">
                      {first && urls[first.id]?.thumb && <img src={urls[first.id].thumb} alt="" className="size-full object-cover" />}
                    </Link>
                  </td>
                  <td className="p-3 font-mono"><Link href={link} className="hover:underline">{r.report_no}</Link></td>
                  <td className="max-w-72 p-3">
                    <Link href={link} className="block truncate hover:underline">{r.road_address ?? r.address ?? "주소 없음"}</Link>
                    <span className="text-xs text-muted-foreground">{[r.sido, r.sigungu].filter(Boolean).join(" ")}</span>
                  </td>
                  <td className="p-3">{REPORT_STATUSES[r.status]}</td>
                  <td className="p-3">
                    {pending > 0
                      ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">대기 {pending}</span>
                      : <span className="text-xs text-muted-foreground">완료</span>}
                  </td>
                  <td className="p-3">
                    {r.deleted_at ? <span className="text-xs text-destructive">삭제됨</span>
                      : r.is_hidden ? <span className="text-xs font-semibold">비공개</span>
                      : <span className="text-xs text-emerald-700">공개</span>}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {f.page > 1 && <Link href={href(f, { page: f.page - 1 })} className="rounded-lg border bg-white px-3 py-1.5">이전</Link>}
          <span className="tabular-nums">{f.page} / {pages}</span>
          {f.page < pages && <Link href={href(f, { page: f.page + 1 })} className="rounded-lg border bg-white px-3 py-1.5">다음</Link>}
        </div>
      )}
    </section>
  );
}
