import "server-only";
import ExcelJS from "exceljs";
import { PHOTO_MODERATION, REPORT_STATUSES } from "@/shared/constants";
import { photoUrl } from "@/shared/photo";
import type { AdminReport } from "@/shared/types";
import type { AdminListFilters } from "./admin";

const kst = (iso: string) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));

const VIEW_LABEL = { all: "전체", public: "공개", hidden: "비공개", deleted: "삭제" } as const;

/** Builds an .xlsx of the given reports, with a second sheet describing the applied filters. */
export async function buildReportsWorkbook(
  reports: AdminReport[],
  filters: Omit<AdminListFilters, "page">,
  opts: { siteUrl: string; exportedAt: string },
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "분홍맨홀 관리자";

  const ws = wb.addWorksheet("제보 목록", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "조회번호", key: "no", width: 18 },
    { header: "처리 상태", key: "status", width: 10 },
    { header: "공개 여부", key: "visibility", width: 10 },
    { header: "시도", key: "sido", width: 8 },
    { header: "시군구", key: "sigungu", width: 12 },
    { header: "도로명 주소", key: "road", width: 36 },
    { header: "지번 주소", key: "addr", width: 36 },
    { header: "메모", key: "memo", width: 30 },
    { header: "위도", key: "lat", width: 12 },
    { header: "경도", key: "lng", width: 12 },
    { header: "사진 수", key: "photos", width: 8 },
    { header: "사진 승인", key: "approved", width: 9 },
    { header: "사진 검토 대기", key: "pending", width: 12 },
    { header: "사진 비공개", key: "private", width: 10 },
    { header: "등록일시", key: "created", width: 17 },
    { header: "수정일시", key: "updated", width: 17 },
    { header: "삭제일시", key: "deleted", width: 17 },
    { header: "승인 사진 URL", key: "photoUrls", width: 50 },
    { header: "공개 페이지", key: "publicUrl", width: 40 },
  ];

  for (const r of reports) {
    const count = (s: keyof typeof PHOTO_MODERATION) => r.report_photos.filter((p) => p.moderation_status === s).length;
    const visible = !r.is_hidden && !r.deleted_at;
    ws.addRow({
      no: r.report_no,
      status: REPORT_STATUSES[r.status],
      visibility: r.deleted_at ? "삭제" : r.is_hidden ? "비공개" : "공개",
      sido: r.sido ?? "",
      sigungu: r.sigungu ?? "",
      road: r.road_address ?? "",
      addr: r.address ?? "",
      memo: r.memo ?? "",
      lat: r.lat,
      lng: r.lng,
      photos: r.report_photos.length,
      approved: count("approved"),
      pending: count("pending"),
      private: count("private"),
      created: kst(r.created_at),
      updated: kst(r.updated_at),
      deleted: r.deleted_at ? kst(r.deleted_at) : "",
      // Only approved photos of visible reports are publicly reachable.
      photoUrls: visible
        ? r.report_photos.filter((p) => p.moderation_status === "approved").map((p) => photoUrl(p.storage_path)).join("\n")
        : "",
      publicUrl: visible ? `${opts.siteUrl}/reports/${r.report_no}` : "",
    });
  }
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8578A" } };
  ws.autoFilter = { from: "A1", to: { row: 1, column: ws.columns.length } };

  const info = wb.addWorksheet("조건");
  info.columns = [{ header: "항목", key: "k", width: 14 }, { header: "값", key: "v", width: 40 }];
  info.addRows([
    { k: "추출 일시", v: opts.exportedAt },
    { k: "보기", v: VIEW_LABEL[filters.view] },
    { k: "검색어", v: filters.q ?? "(없음)" },
    { k: "지역", v: filters.sido ?? "전체" },
    { k: "처리 상태", v: filters.status ? REPORT_STATUSES[filters.status] : "전체" },
    { k: "건수", v: reports.length },
  ]);
  info.getRow(1).font = { bold: true };

  return Buffer.from(await wb.xlsx.writeBuffer());
}
