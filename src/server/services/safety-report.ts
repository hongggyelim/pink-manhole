import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { zipSync, strToU8, type Zippable } from "fflate";
import { siteUrl } from "@/shared/seo";
import { routes } from "@/shared/routes";
import type { AdminReport } from "@/shared/types";
import { desiredBuckets } from "./photo-files";

/**
 * 안전신문고 report kit, zipped: ready-to-paste text (one .txt per 동, reports in the same
 * 동 separated by a line) plus every photo of each report (승인, 비공개 and 검토 대기).
 * The admin files the report by hand; nothing here changes report status.
 */

const SERVICE_INTRO =
  "find pink manhole 사이트는 시민들이 발견한 분홍색 콘크리트 맨홀의 위치와 사진을 모아 위험성을 알리는 시민 제보 서비스입니다.";

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

/**
 * File name (no extension) for the reports of one 동: "[안전신문고 신고] PM-261103-7K3Q 서울특별시 마포구 서교동"
 * for one report, "[안전신문고 신고] 서울특별시 마포구 서교동 3건" for several.
 */
export function safetyReportName(area: string, reports: Pick<AdminReport, "report_no">[]) {
  return safeName(
    reports.length === 1 ? `[안전신문고 신고] ${reports[0].report_no} ${area}` : `[안전신문고 신고] ${area} ${reports.length}건`,
  );
}

const SEPARATOR = "━".repeat(36);

const photoFileName = (r: Pick<AdminReport, "report_no">, i: number) => `${r.report_no}_사진${i + 1}.jpg`;

export function safetyReportText(r: AdminReport) {
  const road = r.road_address;
  const jibun = r.address;
  const place = road ?? jibun ?? "주소 없음";
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
    "■ 참고",
    SERVICE_INTRO,
    `find pink manhole 제보 번호: ${r.report_no}`,
    `제보 일시: ${kstLong(r.created_at)}`,
    ...(visible ? [`제보 페이지: ${siteUrl()}${routes.reportDetail(r.report_no)}`] : []),
    "",
  ];
  return lines.join("\n");
}

/** Every photo file (full size), read with the admin's session from whichever bucket holds each one. */
async function downloadPhotos(db: SupabaseClient, r: AdminReport) {
  const visible = !r.is_hidden && !r.deleted_at;
  return Promise.all(
    r.report_photos.map(async (p, i) => {
      const bucket = desiredBuckets(p.moderation_status, visible).full;
      const { data, error } = await db.storage.from(bucket).download(p.storage_path);
      if (error) throw error;
      return [photoFileName(r, i), new Uint8Array(await data.arrayBuffer())] as const;
    }),
  );
}

/**
 * Reports are grouped by 동: each group is one .txt (reports separated by a line) plus the
 * photos of its reports. One group → its files at the zip root; several → one folder per group.
 * Photos are already JPEG, so they are stored without compression.
 */
export async function buildSafetyReportZip(db: SupabaseClient, reports: AdminReport[]) {
  const groups = new Map<string, AdminReport[]>();
  for (const r of reports) {
    const area = areaUpToDong(r);
    groups.set(area, [...(groups.get(area) ?? []), r]);
  }

  const tree: Zippable = {};
  for (const [area, group] of groups) {
    const name = safetyReportName(area, group);
    const text = group.map(safetyReportText).join(`\n${SEPARATOR}\n\n`);
    const files: Zippable = { [`${name}.txt`]: strToU8(text) };
    for (const r of group) {
      for (const [file, bytes] of await downloadPhotos(db, r)) files[file] = [bytes, { level: 0 }];
    }
    if (groups.size === 1) Object.assign(tree, files);
    else tree[name] = files;
  }

  const stamp = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date())
    .replaceAll("-", "");
  const [[area, group]] = groups;
  const zipName = groups.size === 1 ? safetyReportName(area, group) : `[안전신문고 신고] ${reports.length}건 ${stamp}`;
  return { zip: zipSync(tree), zipName: `${zipName}.zip` };
}
