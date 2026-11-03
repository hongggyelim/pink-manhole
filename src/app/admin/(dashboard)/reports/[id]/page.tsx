import { ChevronLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReportControls } from "@/features/admin/report-controls";
import { ReportPhotos, type ReportPhotoItem } from "@/features/admin/report-photos";
import { ReportDetailMap } from "@/features/reports/report-detail-map";
import { requireAdminPage } from "@/server/auth";
import { getAdminPhotoUrls, getAdminReport } from "@/server/services/admin";
import { PHOTO_MODERATION, REPORT_STATUSES, type PhotoModeration, type ReportStatus } from "@/shared/constants";
import { adminReportIdSchema } from "@/shared/schemas";

export const metadata = { title: "제보 상세" };

export default function AdminReportPage({ params }: PageProps<"/admin/reports/[id]">) {
  return (
    <>
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> 제보 목록
      </Link>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <Detail params={params} />
      </Suspense>
    </>
  );
}

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

function describeLog(action: string, before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  const b = before ?? {};
  const a = after ?? {};
  switch (action) {
    case "status":
      return `상태: ${REPORT_STATUSES[b.status as ReportStatus] ?? "-"} → ${REPORT_STATUSES[a.status as ReportStatus]}${a.auto ? " (자동)" : ""}`;
    case "visibility":
      return a.hidden ? "비공개로 전환" : "공개로 전환";
    case "delete":
      return "삭제";
    case "restore":
      return "삭제 취소 (복구)";
    case "photo":
      return `사진: ${PHOTO_MODERATION[b.moderation as PhotoModeration]} → ${PHOTO_MODERATION[a.moderation as PhotoModeration]}`;
    default:
      return action;
  }
}

async function Detail({ params }: { params: PageProps<"/admin/reports/[id]">["params"] }) {
  const { id } = await params;
  if (!adminReportIdSchema.safeParse(id).success) notFound();
  const { supabase } = await requireAdminPage();
  const { report, logs } = await getAdminReport(supabase, id);
  if (!report) notFound();

  const visible = !report.is_hidden && !report.deleted_at;
  const urls = await getAdminPhotoUrls(supabase, report.report_photos.map((photo) => ({ photo, visible })));
  const address = report.road_address ?? report.address;
  const photos: ReportPhotoItem[] = report.report_photos.map((p) => ({
    photoId: p.id,
    reportId: report.id,
    reportNo: report.report_no,
    address,
    status: p.moderation_status,
    fullUrl: urls[p.id]?.full ?? "",
    thumbUrl: urls[p.id]?.thumb ?? "",
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-lg font-bold sm:text-xl">{report.report_no}</h1>
            {report.deleted_at && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">삭제됨</span>}
            {report.is_hidden && !report.deleted_at && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">비공개</span>}
            {visible && (
              <Link href={`/reports/${report.report_no}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
                공개 페이지 <ExternalLink className="size-3" />
              </Link>
            )}
          </div>
          <p className="mt-1 text-base sm:text-lg">{address ?? "주소 없음"}</p>
          {report.road_address && report.address && <p className="text-sm text-muted-foreground">{report.address}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            {report.lat.toFixed(6)}, {report.lng.toFixed(6)} · 등록 {fmt(report.created_at)}
          </p>
        </div>

        <section>
          <h2 className="mb-2 font-semibold">사진 ({photos.length})</h2>
          <ReportPhotos key={photos.map((p) => p.photoId + p.status).join()} items={photos} />
        </section>

        <section>
          <h2 className="mb-2 font-semibold">위치</h2>
          <div className="overflow-hidden rounded-xl border">
            <ReportDetailMap id={report.id} reportNo={report.report_no} lat={report.lat} lng={report.lng} />
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <ReportControls reportId={report.id} status={report.status} isHidden={report.is_hidden} isDeleted={!!report.deleted_at} />
        <section className="rounded-xl border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">활동 기록</h2>
          {logs.length === 0 && <p className="text-sm text-muted-foreground">아직 기록이 없어요.</p>}
          <ol className="space-y-3">
            {logs.map((l) => (
              <li key={l.id} className="text-sm">
                <p>{describeLog(l.action, l.before, l.after)}</p>
                <p className="text-xs text-muted-foreground">{fmt(l.created_at)}</p>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}
