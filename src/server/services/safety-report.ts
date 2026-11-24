import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { zipSync, strToU8, type Zippable } from "fflate";
import { siteUrl } from "@/shared/seo";
import { routes } from "@/shared/routes";
import type { AdminReport } from "@/shared/types";
import { desiredBuckets } from "./photo-files";

/**
 * 안전신문고 report kit: per report a ready-to-paste .txt plus its approved photos,
 * zipped. The admin files the report by hand; nothing here changes report status.
 */

const SERVICE_INTRO =
  "분홍 맨홀은 시민들이 발견한 분홍색 콘크리트 맨홀의 위치와 사진을 모아 위험성을 알리는 시민 제보 서비스입니다.";

const kstLong = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "long", timeStyle: "short" }).format(new Date(iso));

/** Characters that break file names on Windows/macOS. */
const safeName = (s: string) => s.replace(/[\\/:*?"<>|\n\r\t]/g, " ").replace(/\s+/g, " ").trim();

/** Address up to the 동/읍/면/가 token of the jibun address, e.g. "서울특별시 마포구 서교동". */
export function areaUpToDong(r: Pick<AdminReport, "address" | "sido" | "sigungu">) {
  const tokens = (r.address ?? "").split(/\s+/).filter(Boolean);
  const i = tokens.findIndex((t, idx) => idx > 0 && /(동|읍|면|가)$/.test(t) && !/^\d/.test(t));
  if (i > 0) return tokens.slice(0, i + 1).join(" ");
  return [r.sido, r.sigungu].filter(Boolean).join(" ");
}

/** "[안전신문고 신고] PM-261103-7K3Q 서울특별시 마포구 서교동" (no extension). */
export function safetyReportName(r: AdminReport) {
  return safeName(`[안전신문고 신고] ${r.report_no} ${areaUpToDong(r)}`);
}

const approvedPhotos = (r: AdminReport) => r.report_photos.filter((p) => p.moderation_status === "approved");
const photoFileName = (i: number) => `사진${i + 1}.jpg`;

export function safetyReportText(r: AdminReport) {
  const road = r.road_address;
  const jibun = r.address;
  const place = road ?? jibun ?? "주소 없음";
  const photos = approvedPhotos(r);
  const visible = !r.is_hidden && !r.deleted_at;

  const lines = [
    "■ 제목",
    `보도 위 분홍색 콘크리트 맨홀 덮개 점검 요청 (${place})`,
    "",
    "■ 발생 위치",
    ...(road ? [`도로명 주소: ${road}`] : []),
    ...(jibun ? [`지번 주소: ${jibun}`] : []),
    ...(!road && !jibun ? ["주소 없음"] : []),
    `좌표: ${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}`,
    "",
    "■ 신고 내용",
    "위 위치의 보도에 분홍색 콘크리트(조화) 맨홀 덮개가 설치되어 있습니다.",
    "이런 맨홀은 겉으로는 멀쩡해 보여도 내부가 비어 있거나 손상되어 있을 수 있어,",
    "보행자가 밟는 순간 덮개가 무너져 추락하는 사고로 이어질 위험이 있습니다.",
    "현장 점검 후 필요하면 안전한 덮개로 교체해 주시기 바랍니다.",
    ...(r.memo?.trim() ? ["", `시민 메모: ${r.memo.trim().replace(/\s*\n\s*/g, " ")}`] : []),
    "",
    "■ 첨부 사진",
    ...(photos.length
      ? [`승인된 사진 ${photos.length}장 (안전신문고에 직접 첨부해 주세요)`, ...photos.map((_, i) => `- ${photoFileName(i)}`)]
      : ["승인된 사진 없음"]),
    "",
    "■ 참고",
    SERVICE_INTRO,
    `분홍 맨홀 제보 번호: ${r.report_no}`,
    `제보 일시: ${kstLong(r.created_at)}`,
    ...(visible ? [`제보 페이지: ${siteUrl()}${routes.reportDetail(r.report_no)}`] : []),
    "",
  ];
  return lines.join("\n");
}

/** Approved photo files (full size), read with the admin's session from whichever bucket holds them. */
async function downloadApprovedPhotos(db: SupabaseClient, r: AdminReport) {
  const visible = !r.is_hidden && !r.deleted_at;
  const bucket = desiredBuckets("approved", visible).full;
  return Promise.all(
    approvedPhotos(r).map(async (p, i) => {
      const { data, error } = await db.storage.from(bucket).download(p.storage_path);
      if (error) throw error;
      return [photoFileName(i), new Uint8Array(await data.arrayBuffer())] as const;
    }),
  );
}

/**
 * One report → its files at the zip root. Several → one folder per report.
 * Photos are already JPEG, so they are stored without compression.
 */
export async function buildSafetyReportZip(db: SupabaseClient, reports: AdminReport[]) {
  const single = reports.length === 1;
  const tree: Zippable = {};
  for (const r of reports) {
    const name = safetyReportName(r);
    const files: Zippable = { [`${name}.txt`]: strToU8(safetyReportText(r)) };
    for (const [file, bytes] of await downloadApprovedPhotos(db, r)) files[file] = [bytes, { level: 0 }];
    if (single) Object.assign(tree, files);
    else tree[name] = files;
  }
  const stamp = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date())
    .replaceAll("-", "");
  const zipName = single ? safetyReportName(reports[0]) : `[안전신문고 신고] ${reports.length}건 ${stamp}`;
  return { zip: zipSync(tree), zipName: `${zipName}.zip` };
}
