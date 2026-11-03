import "server-only";

export type GeocodeResult = {
  address: string | null;
  roadAddress: string | null;
  sido: string | null;
  sigungu: string | null;
};

const EMPTY: GeocodeResult = { address: null, roadAddress: null, sido: null, sigungu: null };

const LONG_SIDO: Record<string, string> = {
  경기도: "경기", 강원도: "강원", 충청북도: "충북", 충청남도: "충남",
  전라북도: "전북", 전라남도: "전남", 경상북도: "경북", 경상남도: "경남",
};

/** Normalizes Kakao's region_1depth_name (e.g. "서울특별시", "강원특별자치도", "경기") to the short names in SIDO_LIST. */
export function normalizeSido(raw: string | undefined | null): string | null {
  if (!raw) return null;
  if (LONG_SIDO[raw]) return LONG_SIDO[raw];
  if (raw.startsWith("전북")) return "전북";
  if (raw.startsWith("강원")) return "강원";
  if (raw.startsWith("제주")) return "제주";
  return raw.slice(0, 2);
}

/** Reverse geocoding via Kakao Local REST API. Returns nulls on failure (never throws). */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return EMPTY;
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
      { headers: { Authorization: `KakaoAK ${key}` }, signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return EMPTY;
    const data = await res.json();
    const doc = data.documents?.[0];
    if (!doc) return EMPTY;
    return {
      address: doc.address?.address_name ?? null,
      roadAddress: doc.road_address?.address_name ?? null,
      sido: normalizeSido(doc.address?.region_1depth_name),
      sigungu: doc.address?.region_2depth_name || null,
    };
  } catch {
    return EMPTY;
  }
}
