"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    kakao: any;
  }
}

let loading: Promise<any> | null = null;

/** Loads the Kakao Maps SDK once (with services + clusterer libraries). */
export function loadKakao(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao);
  if (loading) return loading;
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key) return Promise.reject(new Error("NO_KEY"));
  loading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services,clusterer`;
    s.async = true;
    s.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    // A <script> error event carries no details. In practice this is almost always
    // Kakao answering 401 "domain mismatched" because the current origin is not
    // registered as a Web platform domain in Kakao Developers.
    s.onerror = () => {
      s.remove();
      loading = null;
      reject(new Error("LOAD_FAILED"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export type PlaceResult = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

/** Keyword/address search for the location step (Kakao Places, client-side JS key). */
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const kakao = await loadKakao();
  return new Promise((resolve) => {
    new kakao.maps.services.Places().keywordSearch(
      query,
      (data: any[], status: string) => {
        if (status !== kakao.maps.services.Status.OK) return resolve([]);
        resolve(
          data.slice(0, 8).map((d) => ({
            name: d.place_name,
            address: d.road_address_name || d.address_name,
            lat: Number(d.y),
            lng: Number(d.x),
          }))
        );
      }
    );
  });
}
