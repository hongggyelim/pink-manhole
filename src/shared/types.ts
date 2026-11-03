import type { ReportStatus } from "./constants";

export type ReportPhoto = {
  storage_path: string;
  thumb_path: string;
  width: number | null;
  height: number | null;
  sort_order: number;
};

/** Shape returned by public reads (RLS-filtered). */
export type PublicReport = {
  id: string;
  report_no: string;
  status: ReportStatus;
  lat: number;
  lng: number;
  address: string | null;
  road_address: string | null;
  sido: string | null;
  sigungu: string | null;
  created_at: string;
  report_photos: ReportPhoto[];
};

export type MapPoint = { id: string; reportNo: string; lat: number; lng: number; sido: string | null };
