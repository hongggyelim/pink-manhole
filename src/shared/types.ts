import type { PhotoModeration, ReportStatus } from "./constants";

export type ReportPhoto = {
  id: string;
  storage_path: string;
  thumb_path: string;
  blur_path: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  moderation_status: PhotoModeration;
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
  memo: string | null;
  created_at: string;
  report_photos: ReportPhoto[];
};

/** Admin reads include moderation/visibility fields. */
export type AdminReport = PublicReport & {
  is_hidden: boolean;
  deleted_at: string | null;
  updated_at: string;
};

export type MapPoint = { id: string; reportNo: string; lat: number; lng: number; sido: string | null };
