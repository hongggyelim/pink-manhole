"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { shareToKakao } from "./kakao-share";

type Props = {
  /** Path on this site to share (e.g. routes.reportDetail(no)). Defaults to the current page. */
  path?: string;
  label?: string;
  className?: string;
};

/**
 * KakaoTalk share button. If the SDK can't load (missing key, unregistered domain, blocked
 * script), it falls back to the system share sheet, then to copying the link.
 */
export function KakaoShareButton({ path, label = "카카오톡으로 공유하기", className }: Props) {
  const [notice, setNotice] = useState<string | null>(null);

  async function onClick() {
    const url = new URL(path ?? window.location.pathname, window.location.origin).toString();
    try {
      await shareToKakao(url);
      return;
    } catch (e) {
      console.warn("[kakao-share] falling back", e);
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice("링크를 복사했어요.");
    } catch (e) {
      // AbortError = the user closed the share sheet.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setNotice("공유하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
    setTimeout(() => setNotice(null), 2000);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={onClick}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] font-semibold text-black/85"
      >
        <KakaoTalkIcon className="size-5" />
        {label}
      </button>
      <p role="status" aria-live="polite" className="absolute inset-x-0 top-full mt-1 text-center text-xs text-muted-foreground">
        {notice}
      </p>
    </div>
  );
}

function KakaoTalkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M12 3C6.48 3 2 6.48 2 10.77c0 2.76 1.85 5.18 4.63 6.55l-.94 3.45c-.08.3.26.54.52.37l4.12-2.73c.55.07 1.11.11 1.67.11 5.52 0 10-3.48 10-7.75S17.52 3 12 3Z"
      />
    </svg>
  );
}
