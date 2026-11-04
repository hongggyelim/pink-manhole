"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/features/report-form/confirm-dialog";
import { cn } from "@/lib/utils";
import { setReportDeleted, setReportHidden, setReportStatus, type ActionResult } from "@/server/admin-actions";
import { REPORT_STATUSES, type ReportStatus } from "@/shared/constants";

type Props = { reportId: string; status: ReportStatus; isHidden: boolean; isDeleted: boolean };

export function ReportControls({ reportId, status, isHidden, isDeleted }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function act(fn: () => Promise<ActionResult>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 rounded-xl border bg-white p-5">
      <div>
        <p className="mb-2 text-sm font-semibold">처리 상태</p>
        <div className="flex rounded-lg border p-1">
          {(Object.keys(REPORT_STATUSES) as ReportStatus[]).map((s) => (
            <button key={s} disabled={pending || s === status} onClick={() => act(() => setReportStatus(reportId, s))}
              className={cn("flex-1 rounded-md px-2 py-2 text-sm font-medium",
                s === status ? "bg-navy text-white" : "text-muted-foreground hover:bg-muted")}>
              {REPORT_STATUSES[s]}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">모든 사진 검토가 끝나면 &apos;검토중&apos;은 자동으로 &apos;등록&apos;이 돼요.</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">공개 여부</p>
        <div className="flex rounded-lg border p-1">
          {[false, true].map((hidden) => (
            <button key={String(hidden)} disabled={pending || hidden === isHidden || isDeleted}
              onClick={() => act(() => setReportHidden(reportId, hidden))}
              className={cn("flex-1 rounded-md px-2 py-2 text-sm font-medium",
                hidden === isHidden ? "bg-navy text-white" : "text-muted-foreground hover:bg-muted")}>
              {hidden ? "비공개" : "공개"}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">비공개 제보와 사진은 일반 사용자에게 보이지 않아요.</p>
      </div>

      <div className="border-t pt-4">
        {isDeleted ? (
          <button disabled={pending} onClick={() => act(() => setReportDeleted(reportId, false))}
            className="h-10 w-full rounded-lg border text-sm font-semibold">
            삭제 취소 (복구)
          </button>
        ) : (
          <button disabled={pending} onClick={() => setConfirmDelete(true)}
            className="h-10 w-full rounded-lg border border-destructive/40 text-sm font-semibold text-destructive hover:bg-destructive/5">
            제보 삭제
          </button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {/* In-page dialog, not window.confirm(): in-app/embedded browsers often suppress native
          dialogs (confirm() returns false right away), so the delete never ran. */}
      {confirmDelete && (
        <ConfirmDialog
          title="이 제보를 삭제할까요?"
          confirmLabel="삭제"
          cancelLabel="취소"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            act(() => setReportDeleted(reportId, true));
          }}
        >
          사용자에게 보이지 않게 되며, 삭제 목록에서 복구할 수 있어요.
        </ConfirmDialog>
      )}
    </div>
  );
}
