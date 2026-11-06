"use client";

import { routes } from "@/shared/routes";
import { ChevronLeft, ChevronRight, EyeOff, Check, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { moderatePhoto } from "@/server/admin-actions";
import { PHOTO_MODERATION, type PhotoModeration } from "@/shared/constants";

export type LightboxItem = {
  photoId: string;
  reportId: string;
  reportNo: string;
  address: string | null;
  fullUrl: string;
  status: PhotoModeration;
};

type Props = {
  items: LightboxItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  /** Called after a successful decision (parent updates/removes the item). */
  onDecided: (photoId: string, decision: PhotoModeration) => void;
};

/**
 * Full-screen viewer: zoom/pan the photo and approve / make private / cancel the review without leaving it.
 * Keys: ← → navigate · A approve · H 비공개 · U 검토 취소 · Z zoom · Esc close.
 */
export function PhotoLightbox({ items, index, onIndexChange, onClose, onDecided }: Props) {
  const item = items[index];
  const [zoomed, setZoomed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const go = useCallback(
    (delta: number) => {
      if (!items.length) return;
      setZoomed(false);
      setError(null);
      onIndexChange((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndexChange],
  );

  const decide = useCallback(
    (decision: PhotoModeration) => {
      if (!item || pending || item.status === decision) return;
      setError(null);
      startTransition(async () => {
        const res = await moderatePhoto(item.photoId, decision);
        if (!res.ok) return setError(res.error);
        // Keep the current zoom level so the next photo can be checked the same way.
        onDecided(item.photoId, decision);
      });
    },
    [item, pending, onDecided],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key.toLowerCase() === "a") decide("approved");
      else if (e.key.toLowerCase() === "h") decide("private");
      else if (e.key.toLowerCase() === "u") decide("pending");
      else if (e.key.toLowerCase() === "z") setZoomed((z) => !z);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, decide, onClose]);

  const [touchX, setTouchX] = useState<number | null>(null);

  if (!item) return null;

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white">
      <div className="flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 text-sm sm:gap-3 sm:px-4">
        <span className="tabular-nums text-white/70">{index + 1} / {items.length}</span>
        <Link href={routes.adminReport(item.reportId)} className="font-mono font-semibold underline-offset-2 hover:underline">
          {item.reportNo}
        </Link>
        <span className="hidden truncate text-white/70 sm:inline">{item.address ?? "주소 없음"}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold",
          item.status === "approved" ? "bg-emerald-500/20 text-emerald-300"
            : item.status === "private" ? "bg-white/15 text-white/80" : "bg-amber-500/20 text-amber-300")}>
          {PHOTO_MODERATION[item.status]}
        </span>
        <div className="flex-1" />
        <button aria-label={zoomed ? "축소" : "확대"} onClick={() => setZoomed((z) => !z)} className="rounded-full p-2 hover:bg-white/10">
          {zoomed ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
        </button>
        <button aria-label="닫기" onClick={onClose} className="rounded-full p-2 hover:bg-white/10">
          <X className="size-5" />
        </button>
      </div>

      <div
        className="relative min-h-0 flex-1"
        onTouchStart={(e) => !zoomed && setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX === null) return;
          const dx = e.changedTouches[0].clientX - touchX;
          if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
          setTouchX(null);
        }}
      >
        <div className={cn("absolute inset-0", zoomed ? "overflow-auto" : "flex items-center justify-center overflow-hidden")}>
          <img
            key={item.photoId}
            src={item.fullUrl}
            alt="검토할 사진"
            onClick={() => setZoomed((z) => !z)}
            className={cn(zoomed ? "max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain")}
            style={zoomed ? { width: "200%" } : undefined}
          />
        </div>
        {items.length > 1 && (
          <>
            <button aria-label="이전" onClick={() => go(-1)} className="absolute top-1/2 left-2 hidden sm:block -translate-y-1/2 rounded-full bg-black/50 p-2.5 hover:bg-black/70">
              <ChevronLeft className="size-6" />
            </button>
            <button aria-label="다음" onClick={() => go(1)} className="absolute top-1/2 right-2 hidden sm:block -translate-y-1/2 rounded-full bg-black/50 p-2.5 hover:bg-black/70">
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="max-w-full truncate text-xs text-white/60 sm:hidden">{item.address ?? "주소 없음"}</p>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="flex w-full max-w-md gap-3">
          {item.status !== "pending" && (
            <button disabled={pending} onClick={() => decide("pending")}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-white/15 font-semibold hover:bg-white/25 disabled:opacity-50">
              <RotateCcw className="size-5" /> 검토 취소 <kbd className="hidden text-xs text-white/50 sm:inline">U</kbd>
            </button>
          )}
          <button disabled={pending || item.status === "private"} onClick={() => decide("private")}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-white/15 font-semibold hover:bg-white/25 disabled:opacity-50">
            <EyeOff className="size-5" /> 비공개 <kbd className="hidden text-xs text-white/50 sm:inline">H</kbd>
          </button>
          <button disabled={pending || item.status === "approved"} onClick={() => decide("approved")}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary font-semibold hover:bg-primary/90 disabled:opacity-50">
            <Check className="size-5" /> 승인 <kbd className="hidden text-xs text-white/60 sm:inline">A</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
