"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { loadKakaoSdk, shareToKakao, type ShareCard } from "./kakao-sdk";

/**
 * "친구와 같이 제보하기": KakaoTalk share sheet. If the SDK can't load (no key, unregistered
 * domain, blocked script) it falls back to the system share sheet, then to copying the link.
 */
export function KakaoShareButton({ card }: { card: ShareCard }) {
  const [copied, setCopied] = useState(false);

  // Warm the SDK so the tap opens the share sheet without a script round trip.
  useEffect(() => {
    loadKakaoSdk().catch(() => {});
  }, []);

  async function share() {
    try {
      await shareToKakao(card);
      trackEvent("share", { method: "kakao" });
      return;
    } catch {
      /* fall through */
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: card.title, text: card.description, url: card.url });
        trackEvent("share", { method: "system" });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // user closed the share sheet
    }
    try {
      await navigator.clipboard.writeText(card.url);
      trackEvent("share", { method: "copy" });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* nothing else to try */
    }
  }

  return (
    <button type="button" onClick={share} className="flex w-full items-center gap-3 py-4 text-left">
      <span aria-hidden className="flex size-5 items-center justify-center rounded-md bg-[#FEE500]">
        <KakaoBubble />
      </span>
      <span className="flex-1 font-medium">친구와 같이 제보하기</span>
      {copied ? (
        <span role="status" className="text-xs text-muted-foreground">링크를 복사했어요</span>
      ) : (
        <ChevronRight className="size-4 text-muted-foreground" />
      )}
    </button>
  );
}

function KakaoBubble() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="#191919">
      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.86 1.88 5.37 4.7 6.78-.2.73-.74 2.68-.85 3.1-.13.52.19.51.4.37.17-.11 2.66-1.8 3.73-2.53.66.1 1.33.15 2.02.15 5.52 0 10-3.58 10-8S17.52 3 12 3Z" />
    </svg>
  );
}
