import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { REPORT_STATUSES } from "@/shared/constants";
import { formatDate } from "@/shared/format";
import { photoUrl } from "@/shared/photo";
import type { PublicReport } from "@/shared/types";

export function ReportListItem({ report }: { report: PublicReport }) {
  const thumb = report.report_photos[0]?.thumb_path;
  return (
    <Link href={`/reports/${report.report_no}`} className="flex items-center gap-3 py-3">
      <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
        {thumb && <img src={photoUrl(thumb)} alt="" className="size-full object-cover" loading="lazy" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">
          {report.road_address ?? report.address ?? "주소 정보 없음"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDate(report.created_at)} · <StatusText status={report.status} />
        </p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

export function StatusText({ status }: { status: PublicReport["status"] }) {
  return <span className={status === "resolved" ? "text-emerald-600" : "text-primary"}>{REPORT_STATUSES[status]}</span>;
}
