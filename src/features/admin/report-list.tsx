"use client";

import { ChevronDown, Download, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { ConfirmDialog } from "@/features/report-form/confirm-dialog";
import { cn } from "@/lib/utils";
import { runReportAction, type ReportAction } from "@/server/admin-actions";
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

type ActionDef = {
  label: string;
  /** Shown in the confirm dialog. */
  note: string;
  danger?: boolean;
  /** Ask before running it on a single report too (bulk runs always ask). */
  confirmSingle?: boolean;
  appliesTo: (r: AdminReport) => boolean;
};

const hasPending = (r: AdminReport) => r.report_photos.some((p) => p.moderation_status === "pending");
const hasReviewed = (r: AdminReport) => r.report_photos.some((p) => p.moderation_status !== "pending");

/** Menu order. `appliesTo` decides which reports an action is offered for (and run on, in bulk). */
const REPORT_ACTIONS: [ReportAction, ActionDef][] = [
  ["approve_photos", { label: "사진 승인", note: "검토 대기 중인 사진을 모두 승인해요. 공개 제보라면 사용자에게 사진이 보여요.", appliesTo: hasPending }],
  ["private_photos", { label: "사진 비공개", note: "검토 대기 중인 사진을 모두 비공개로 처리해요.", appliesTo: hasPending }],
  ["reset_photos", { label: "사진 검토 취소", note: "검토한 사진을 다시 검토 대기로 돌려요. 사용자에게는 흐리게 보이고, 처리 상태가 '등록'이면 '검토중'으로 바뀌어요.", appliesTo: hasReviewed }],
  ["hide", { label: "제보 비공개", note: "제보와 사진이 사용자에게 보이지 않게 돼요.", appliesTo: (r) => !r.is_hidden && !r.deleted_at }],
  ["unhide", { label: "제보 공개", note: "제보가 다시 사용자에게 보여요.", appliesTo: (r) => r.is_hidden && !r.deleted_at }],
  ["delete", { label: "삭제", note: "사용자에게 보이지 않게 되며, 삭제 목록에서 복구할 수 있어요.", danger: true, confirmSingle: true, appliesTo: (r) => !r.deleted_at }],
  ["restore", { label: "복구", note: "복구한 제보는 이전 공개 상태로 돌아가요.", appliesTo: (r) => Boolean(r.deleted_at) }],
];
/** 을/를 for the label's last syllable (final consonant → 을). */
const objectParticle = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? "을" : "를";
};

const ACTION_DEFS = Object.fromEntries(REPORT_ACTIONS) as Record<ReportAction, ActionDef>;

type MenuItem = { action: ReportAction; label: string; danger?: boolean };

/**
 * Small dropdown. The panel is `position: fixed` (placed from the trigger's rect) so it is not
 * clipped by the table's horizontal scroll container; it closes on outside click, Esc, scroll or resize.
 */
function ActionMenu({ trigger, triggerClass, label, items, disabled, onSelect }: {
  trigger: ReactNode;
  triggerClass: string;
  label: string;
  items: MenuItem[];
  disabled?: boolean;
  onSelect: (action: ReportAction) => void;
}) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  function toggle() {
    if (pos) return setPos(null);
    const r = buttonRef.current!.getBoundingClientRect();
    const panelHeight = items.length * 40 + 8;
    const top = r.bottom + 4 + panelHeight > window.innerHeight ? Math.max(8, r.top - 4 - panelHeight) : r.bottom + 4;
    setPos({ top, right: Math.max(8, window.innerWidth - r.right) });
  }

  return (
    <>
      <button ref={buttonRef} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={Boolean(pos)}
        disabled={disabled || items.length === 0} onClick={toggle} className={triggerClass}>
        {trigger}
      </button>
      {pos && (
        <div ref={panelRef} role="menu" style={{ top: pos.top, right: pos.right }}
          className="fixed z-40 min-w-40 rounded-lg border bg-white p-1 text-sm shadow-lg">
          {items.map((it) => (
            <button key={it.action} type="button" role="menuitem"
              onClick={() => { setPos(null); onSelect(it.action); }}
              className={cn("flex h-10 w-full items-center rounded-md px-3 text-left font-medium hover:bg-muted",
                it.danger && "text-destructive hover:bg-destructive/5")}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

const checkboxClass = "size-4 cursor-pointer accent-primary";

/**
 * Admin report list (mobile cards + desktop table). Each row has an action menu (photo approve /
 * private / review cancel, report hide / unhide, delete / restore), and the same actions run in
 * bulk on the selected rows, each on the reports it applies to.
 */
export function AdminReportList({ reports, thumbs, count, exportHref }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** Action waiting for confirmation, with the reports it will run on. */
  const [confirming, setConfirming] = useState<{ action: ReportAction; ids: string[]; bulk: boolean } | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allChecked = reports.length > 0 && selected.size === reports.length;
  const someChecked = selected.size > 0 && !allChecked;
  const selectedReports = reports.filter((r) => selected.has(r.id));

  /** Selection menu: every action that applies to at least one selected report, with how many. */
  const bulkItems: MenuItem[] = REPORT_ACTIONS.flatMap(([action, def]) => {
    const n = selectedReports.filter(def.appliesTo).length;
    return n > 0 ? [{ action, label: `${def.label} (${n}건)`, danger: def.danger }] : [];
  });
  const rowItems = (r: AdminReport): MenuItem[] =>
    REPORT_ACTIONS.filter(([, def]) => def.appliesTo(r)).map(([action, def]) => ({ action, label: def.label, danger: def.danger }));

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
  function execute(action: ReportAction, ids: string[], bulk: boolean) {
    setConfirming(null);
    setError(null);
    start(async () => {
      const res = await runReportAction(ids, action);
      if (!res.ok) setError(res.error);
      else if (bulk) setSelected(new Set());
      router.refresh();
    });
  }
  function onRowAction(r: AdminReport, action: ReportAction) {
    if (ACTION_DEFS[action].confirmSingle) setConfirming({ action, ids: [r.id], bulk: false });
    else execute(action, [r.id], false);
  }
  function onBulkAction(action: ReportAction) {
    setConfirming({ action, ids: selectedReports.filter(ACTION_DEFS[action].appliesTo).map((r) => r.id), bulk: true });
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

  const rowMenu = (r: AdminReport) => (
    <ActionMenu
      label={`${r.report_no} 처리`}
      items={rowItems(r)}
      disabled={pending}
      onSelect={(action) => onRowAction(r, action)}
      triggerClass="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-50"
      trigger={<MoreHorizontal className="size-5" />}
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
            <ActionMenu
              label="선택한 제보 일괄 처리"
              items={bulkItems}
              disabled={pending}
              onSelect={onBulkAction}
              triggerClass="inline-flex h-9 items-center gap-1 rounded-lg border bg-white px-3 text-sm font-semibold hover:bg-muted disabled:opacity-50"
              trigger={pending ? "처리 중…" : <>일괄 처리 <ChevronDown className="size-4" /></>}
            />
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
            <div className="flex shrink-0 items-start pt-2 pr-1">{rowMenu(r)}</div>
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
                <th className="w-12 p-3"><span className="sr-only">처리</span></th>
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
                    <td className="p-1.5">{rowMenu(r)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title={confirming.bulk
            ? `선택한 제보 ${confirming.ids.length}건에 ${ACTION_DEFS[confirming.action].label}${objectParticle(ACTION_DEFS[confirming.action].label)} 적용할까요?`
            : `이 제보를 ${ACTION_DEFS[confirming.action].label}할까요?`}
          confirmLabel={ACTION_DEFS[confirming.action].label}
          cancelLabel="취소"
          onCancel={() => setConfirming(null)}
          onConfirm={() => execute(confirming.action, confirming.ids, confirming.bulk)}
        >
          {ACTION_DEFS[confirming.action].note}
          {confirming.bulk && confirming.ids.length < selected.size && (
            <span className="mt-1 block">선택한 {selected.size}건 중 해당하는 {confirming.ids.length}건에만 적용돼요.</span>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}
