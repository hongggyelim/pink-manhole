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

async function kakao(path: string, key: string) {
  const res = await fetch(`https://dapi.kakao.com/v2/local/geo/${path}`, {
    headers: { Authorization: `KakaoAK ${key}` },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) {
    // Surface misconfiguration (wrong key, Local API disabled, quota) instead of failing silently.
    console.error(`[geocode] Kakao ${path.split("?")[0]} → HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return null;
  }
  return res.json();
}

let warnedMissingKey = false;

/**
 * Reverse geocoding via Kakao Local REST API. Never throws.
 * 1) coord2address → road / lot address. 2) If the point has no address (mountain, sea,
 * open land), coord2regioncode → the legal-dong name, so the user still sees a place name.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    if (!warnedMissingKey) {
      console.error("[geocode] KAKAO_REST_API_KEY is not set — every location will be saved without an address.");
      warnedMissingKey = true;
    }
    return EMPTY;
  }
  try {
    const data = await kakao(`coord2address.json?x=${lng}&y=${lat}`, key);
    const doc = data?.documents?.[0];
    if (doc) {
      return {
        address: doc.address?.address_name ?? null,
        roadAddress: doc.road_address?.address_name ?? null,
        sido: normalizeSido(doc.address?.region_1depth_name),
        sigungu: doc.address?.region_2depth_name || null,
      };
    }
    const region = await kakao(`coord2regioncode.json?x=${lng}&y=${lat}`, key);
    const r = region?.documents?.find((d: { region_type: string }) => d.region_type === "B") ?? region?.documents?.[0];
    if (!r) return EMPTY;
    return {
      address: r.address_name ?? null,
      roadAddress: null,
      sido: normalizeSido(r.region_1depth_name),
      sigungu: r.region_2depth_name || null,
    };
  } catch (e) {
    console.error("[geocode] request failed", e);
    return EMPTY;
  }
}
