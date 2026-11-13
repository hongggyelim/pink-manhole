import { ChevronRight } from "lucide-react";
import { routes } from "@/shared/routes";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PhotoPlaceholder } from "@/components/photo-placeholder";
import { REPORT_STATUSES } from "@/shared/constants";
import { formatDate } from "@/shared/format";
import { publicPhoto } from "@/shared/photo";
import type { PublicReport } from "@/shared/types";

export function ReportListItem({ report }: { report: PublicReport }) {
  const first = report.report_photos[0];
  const photo = first ? publicPhoto(first) : null;
  return (
    <Link href={routes.reportDetail(report.report_no)} className="flex items-center gap-3 py-3">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
        {photo?.kind === "approved" && <img src={photo.thumb} alt="" className="size-full object-cover" loading="lazy" />}
        {photo && photo.kind !== "approved" && <PhotoPlaceholder kind={photo.kind} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{report.road_address ?? report.address ?? "주소 정보 없음"}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <StatusBadge status={report.status} />
          {report.sigungu && <span>{report.sido} {report.sigungu}</span>}
          <span>· {formatDate(report.created_at)}</span>
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

const STATUS_STYLE: Record<PublicReport["status"], string> = {
  reviewing: "bg-amber-50 text-amber-700",
  registered: "bg-pink-soft text-primary",
  submitted: "bg-emerald-50 text-emerald-700",
};

export function StatusBadge({ status }: { status: PublicReport["status"] }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_STYLE[status])}>
      {REPORT_STATUSES[status]}
    </span>
  );
}
