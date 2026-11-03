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

/** 17 시·도 with approximate centers (for filter → map move). `match` = prefix used in Kakao region names. */
export const SIDO_LIST = [
  { name: "서울", match: "서울", lat: 37.5665, lng: 126.978, level: 8 },
  { name: "부산", match: "부산", lat: 35.1796, lng: 129.0756, level: 8 },
  { name: "대구", match: "대구", lat: 35.8714, lng: 128.6014, level: 8 },
  { name: "인천", match: "인천", lat: 37.4563, lng: 126.7052, level: 9 },
  { name: "광주", match: "광주", lat: 35.1595, lng: 126.8526, level: 8 },
  { name: "대전", match: "대전", lat: 36.3504, lng: 127.3845, level: 8 },
  { name: "울산", match: "울산", lat: 35.5384, lng: 129.3114, level: 8 },
  { name: "세종", match: "세종", lat: 36.48, lng: 127.289, level: 8 },
  { name: "경기", match: "경기", lat: 37.4138, lng: 127.5183, level: 10 },
  { name: "강원", match: "강원", lat: 37.8228, lng: 128.1555, level: 11 },
  { name: "충북", match: "충북", lat: 36.6357, lng: 127.4917, level: 10 },
  { name: "충남", match: "충남", lat: 36.5184, lng: 126.8, level: 10 },
  { name: "전북", match: "전북", lat: 35.7175, lng: 127.153, level: 10 },
  { name: "전남", match: "전남", lat: 34.8679, lng: 126.991, level: 10 },
  { name: "경북", match: "경북", lat: 36.4919, lng: 128.8889, level: 11 },
  { name: "경남", match: "경남", lat: 35.4606, lng: 128.2132, level: 10 },
  { name: "제주", match: "제주", lat: 33.4996, lng: 126.5312, level: 10 },
] as const;
