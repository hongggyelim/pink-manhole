export const MAX_PHOTOS = 3;
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024; // after client-side compression
export const PHOTO_BUCKET = "report-photos";
export const MEMO_MAX_LENGTH = 200;

/** Must match the `report_status` enum in supabase/migrations. */
export const REPORT_STATUSES = {
  received: "접수",
  reviewing: "확인 중",
  submitted: "민원 제출",
  resolved: "처리 완료",
  rejected: "반려",
} as const;
export type ReportStatus = keyof typeof REPORT_STATUSES;

/** Rough bounding box of South Korea, used for server-side validation. */
export const KOREA_BOUNDS = { minLat: 33.0, maxLat: 38.7, minLng: 124.5, maxLng: 132.0 };
