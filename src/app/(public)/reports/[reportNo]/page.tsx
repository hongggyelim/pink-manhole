import { MapPin } from "lucide-react";
import { Route, routes, withQuery } from "@/shared/routes";
import { pageMetadata } from "@/shared/seo";
import { REPORT_STATUSES } from "@/shared/constants";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CopyButton } from "@/features/reports/copy-button";
import { ReportDetailMap } from "@/features/reports/report-detail-map";
import { StatusBadge } from "@/features/reports/report-list-item";
import { countNearby, getReportByNo } from "@/server/services/reports";
import { formatDate } from "@/shared/format";
import { photoUrl, publicPhoto } from "@/shared/photo";
import { reportNoSchema } from "@/shared/schemas";

export async function generateMetadata({ params }: PageProps<"/reports/[reportNo]">): Promise<Metadata> {
  const { reportNo } = await params;
  const report = reportNoSchema.safeParse(reportNo).success ? await getReportByNo(reportNo) : null;
  if (!report) return { title: "제보를 찾을 수 없어요", robots: { index: false } };

  const address = report.road_address ?? report.address;
  // Share card: the approved photo when there is one; otherwise the default card
  // (never the blur preview — it would look like a broken image in a chat preview).
  const approved = report.report_photos.find((p) => p.moderation_status === "approved");
  const description = [
    `${REPORT_STATUSES[report.status]} · ${formatDate(report.created_at)} 제보`,
    report.memo,
    "분홍 맨홀을 발견하면 제보해주세요.",
  ].filter(Boolean).join(" — ");

  return pageMetadata({
    title: address ?? "제보 상세",
    description,
    path: routes.reportDetail(report.report_no),
    images: approved
      ? [{
          url: photoUrl(approved.storage_path),
          width: approved.width ?? undefined,
          height: approved.height ?? undefined,
          alt: `${address ?? "제보 위치"}의 분홍 맨홀 사진`,
        }]
      : undefined,
  });
}

export default function ReportDetailPage({ params }: PageProps<"/reports/[reportNo]">) {
  return (
    <main className="pb-10">
      <PageHeader title="상세 위치 정보" />
      <Suspense fallback={<div className="h-64 bg-[#eef1f4]" />}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}

async function Detail({ params }: { params: PageProps<"/reports/[reportNo]">["params"] }) {
  const { reportNo } = await params;
  if (!reportNoSchema.safeParse(reportNo).success) notFound();
  const report = await getReportByNo(reportNo);
  if (!report) notFound();
  const nearby = await countNearby(report.lat, report.lng);

  return (
    <>
      <ReportDetailMap id={report.id} reportNo={report.report_no} lat={report.lat} lng={report.lng} />

      <div className="grid grid-cols-3 gap-2 px-4 pt-4">
        {report.report_photos.map((p, i) => {
          const photo = publicPhoto(p);
          const img = photo.thumb && (
            <img src={photo.thumb} alt={`제보 사진 ${i + 1}`} className="size-full object-cover" />
          );
          return photo.full ? (
            <a key={p.id} href={photo.full} target="_blank" rel="noreferrer"
              className="aspect-square overflow-hidden rounded-xl bg-muted">
              {img}
            </a>
          ) : (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
              {img}
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.6)]">
                검토 중
              </span>
            </div>
          );
        })}
      </div>
      {report.report_photos.some((p) => p.moderation_status === "pending") && (
        <p className="px-4 pt-2 text-xs text-muted-foreground">사진은 관리자 검토 후 공개돼요.</p>
      )}

      <section className="px-4 pt-4">
        <p className="flex items-start gap-1.5 text-[17px] font-bold">
          <MapPin className="mt-0.5 size-5 shrink-0 fill-primary text-primary [&>circle]:fill-white [&>circle]:stroke-white" />
          {report.road_address ?? report.address ?? "주소 정보 없음"}
        </p>
        {report.road_address && report.address && (
          <p className="mt-1 pl-6.5 text-sm text-muted-foreground">{report.address}</p>
        )}
        {report.memo && (
          <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed whitespace-pre-line">{report.memo}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-muted px-2.5 py-1">사용자 제보</span>
          <span className="rounded-full bg-muted px-2.5 py-1">{formatDate(report.created_at)}</span>
          <StatusBadge status={report.status} />
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
          <span className="text-muted-foreground">조회번호</span>
          <span className="flex items-center gap-1 font-mono font-semibold">
            {report.report_no}
            <CopyButton text={report.report_no} />
          </span>
        </div>
      </section>

      <div className="mt-6 h-2 bg-muted" />

      <section className="px-4 pt-5">
        <h2 className="text-lg font-bold">주변 신고 현황</h2>
        <p className="mt-1 text-sm text-muted-foreground">이 위치에서 총 {nearby}건의 제보가 접수되었어요.</p>
        <Link
          href={withQuery(Route.Map, { lat: report.lat, lng: report.lng })}
          className="mt-4 flex h-12 items-center justify-center rounded-xl bg-pink-soft font-semibold text-primary"
        >
          유사한 위치 보기
        </Link>
      </section>
    </>
  );
}
