"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/features/report-form/confirm-dialog";
import { cn } from "@/lib/utils";
import { setReportsDeleted } from "@/server/admin-actions";
import { REPORT_STATUSES } from "@/shared/constants";
import { formatDate } from "@/shared/format";
import { routes } from "@/shared/routes";
import type { AdminReport } from "@/shared/types";

type Props = {
  reports: AdminReport[];
  /** report id → thumbnail URL (admin URLs: public or signed). */
  thumbs: Record<string, string | undefined>;
  count: number;
  exportHref: string;
  /** In the 삭제 view the bulk action restores instead of deleting. */
  deletedView: boolean;
};

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

const checkboxClass = "size-4 cursor-pointer accent-primary";

/** Admin report list (mobile cards + desktop table) with row selection and bulk delete/restore. */
export function AdminReportList({ reports, thumbs, count, exportHref, deletedView }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allChecked = reports.length > 0 && selected.size === reports.length;
  const someChecked = selected.size > 0 && !allChecked;
  const actionLabel = deletedView ? "복구" : "삭제";

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(reports.map((r) => r.id)));
  }
  function runBulk() {
    setConfirming(false);
    setError(null);
    start(async () => {
      const res = await setReportsDeleted([...selected], !deletedView);
      if (!res.ok) setError(res.error);
      else setSelected(new Set());
      router.refresh();
    });
  }

  const thumb = (r: AdminReport) =>
    thumbs[r.id] ? <img src={thumbs[r.id]} alt="" className="size-full object-cover" /> : null;
  const rowCheckbox = (r: AdminReport) => (
    <input
      type="checkbox"
      className={checkboxClass}
      checked={selected.has(r.id)}
      onChange={() => toggle(r.id)}
      aria-label={`${r.report_no} 선택`}
    />
  );

  return (
    <>
      <div className="mt-4 mb-2 flex min-h-9 items-center justify-between gap-2">
        <label className={cn("flex items-center gap-2 text-sm", reports.length === 0 && "pointer-events-none opacity-50")}>
          <input
            type="checkbox"
            className={checkboxClass}
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = someChecked;
            }}
            onChange={toggleAll}
            disabled={reports.length === 0}
            aria-label="이 페이지의 제보 전체 선택"
          />
          {selected.size > 0
            ? <span className="font-medium">{selected.size}건 선택</span>
            : <span className="text-muted-foreground">{count.toLocaleString()}건</span>}
        </label>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(true)}
              className={cn(
                "inline-flex h-9 items-center rounded-lg border px-3 text-sm font-semibold disabled:opacity-50",
                deletedView ? "bg-white hover:bg-muted" : "border-destructive/40 bg-white text-destructive hover:bg-destructive/5",
              )}
            >
              {pending ? "처리 중…" : `선택 ${actionLabel}`}
            </button>
          )}
          <a
            href={exportHref}
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
      </div>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

      {reports.length === 0 && (
        <p className="rounded-xl border bg-white p-10 text-center text-muted-foreground">조건에 맞는 제보가 없어요.</p>
      )}

      {/* Mobile: cards */}
      <ul className="space-y-2 md:hidden">
        {reports.map((r) => (
          <li key={r.id} className={cn("flex rounded-xl border bg-white", selected.has(r.id) && "border-primary")}>
            <label className="flex shrink-0 items-center pr-1 pl-3">{rowCheckbox(r)}</label>
            <Link href={routes.adminReport(r.id)} className="flex min-w-0 flex-1 gap-3 p-3 pl-2">
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
                <th className="w-10 p-3"><span className="sr-only">선택</span></th>
                <th className="p-3">사진</th><th className="p-3">조회번호</th><th className="p-3">주소</th>
                <th className="p-3">상태</th><th className="p-3">사진 검토</th><th className="p-3">공개</th><th className="p-3">등록일</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reports.map((r) => {
                const link = routes.adminReport(r.id);
                return (
                  <tr key={r.id} className={cn("hover:bg-neutral-50", selected.has(r.id) && "bg-pink-soft/40")}>
                    <td className="p-3"><label className="flex items-center">{rowCheckbox(r)}</label></td>
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

      {confirming && (
        <ConfirmDialog
          title={`선택한 제보 ${selected.size}건을 ${actionLabel}할까요?`}
          confirmLabel={actionLabel}
          cancelLabel="취소"
          onCancel={() => setConfirming(false)}
          onConfirm={runBulk}
        >
          {deletedView
            ? "복구한 제보는 이전 공개 상태로 돌아가요."
            : "사용자에게 보이지 않게 되며, 삭제 목록에서 복구할 수 있어요."}
        </ConfirmDialog>
      )}
    </>
  );
}
