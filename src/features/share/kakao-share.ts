"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Kakao: any;
  }
}

/** Kakao JS SDK (공유 전용). Separate from the Maps SDK in src/features/map. */
const SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

let loading: Promise<any> | null = null;

/** Loads and initialises the Kakao JS SDK once. Rejects with NO_KEY / LOAD_FAILED. */
export function loadKakaoSdk(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.Kakao?.isInitialized?.()) return Promise.resolve(window.Kakao);
  if (loading) return loading;
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key) return Promise.reject(new Error("NO_KEY"));
  loading = new Promise((resolve, reject) => {
    const init = () => {
      if (!window.Kakao.isInitialized()) window.Kakao.init(key);
      resolve(window.Kakao);
    };
    if (window.Kakao) return init();
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.onload = init;
    s.onerror = () => {
      s.remove();
      loading = null;
      reject(new Error("LOAD_FAILED"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Shares `url` to KakaoTalk as a scrap: Kakao builds the card from the page's Open Graph tags
 * (pageMetadata), so the preview always matches what other apps show.
 * The URL's domain must be registered under the app's Web platform in Kakao Developers.
 */
export async function shareToKakao(url: string) {
  const Kakao = await loadKakaoSdk();
  Kakao.Share.sendScrap({ requestUrl: url });
}
