"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    /** Kakao JavaScript SDK (Share). Not the Maps SDK, which is `window.kakao` (src/features/map). */
    Kakao: any;
  }
}

/** Pinned Kakao JS SDK; bump both together (hash = sha384 of the file, base64). */
const SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.5/kakao.min.js";
const SDK_INTEGRITY = "sha384-v6JKY3z4FUkWq21oZDHZe74YvuPk/WUrVLrDHTBojHXClOSa3iXy7sCXPY1jkFbj";

let loading: Promise<any> | null = null;

/** Loads + initialises the Kakao JS SDK once. Rejects without a JS key or if the script fails. */
export function loadKakaoSdk(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key) return Promise.reject(new Error("NO_KEY"));
  if (window.Kakao?.isInitialized?.()) return Promise.resolve(window.Kakao);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.integrity = SDK_INTEGRITY;
    s.crossOrigin = "anonymous";
    s.async = true;
    s.onload = () => {
      if (!window.Kakao.isInitialized()) window.Kakao.init(key);
      resolve(window.Kakao);
    };
    s.onerror = () => {
      s.remove();
      loading = null;
      reject(new Error("LOAD_FAILED"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export type ShareCard = {
  title: string;
  description: string;
  /** Absolute URLs. Their domain must be registered as a Web platform domain in Kakao Developers. */
  imageUrl: string;
  url: string;
  buttonTitle: string;
};

/** Opens the KakaoTalk share sheet (feed template). */
export async function shareToKakao(card: ShareCard) {
  const Kakao = await loadKakaoSdk();
  const link = { mobileWebUrl: card.url, webUrl: card.url };
  Kakao.Share.sendDefault({
    objectType: "feed",
    content: { title: card.title, description: card.description, imageUrl: card.imageUrl, link },
    buttons: [{ title: card.buttonTitle, link }],
  });
}
