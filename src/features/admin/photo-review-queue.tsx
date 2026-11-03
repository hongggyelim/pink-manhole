"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoLightbox, type LightboxItem } from "./photo-lightbox";

export type QueueItem = LightboxItem & { thumbUrl: string; sido: string | null; sigungu: string | null; isHidden: boolean };

/** Pending-photo grid. Deciding in the lightbox removes the photo and moves on to the next one. */
export function PhotoReviewQueue({ initialItems }: { initialItems: QueueItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [open, setOpen] = useState<number | null>(null);

  function onDecided(photoId: string) {
    const next = items.filter((p) => p.photoId !== photoId);
    setItems(next);
    setOpen((i) => (next.length === 0 || i === null ? null : Math.min(i, next.length - 1)));
    router.refresh(); // update header badge
  }

  if (items.length === 0) {
    return <p className="rounded-xl border bg-white py-16 text-center text-muted-foreground">검토할 사진이 없어요. 🎉</p>;
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((p, i) => (
          <li key={p.photoId}>
            <button onClick={() => setOpen(i)} className="group block w-full overflow-hidden rounded-xl border bg-white text-left">
              <div className="aspect-square overflow-hidden bg-muted">
                <img src={p.thumbUrl} alt="" loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
              </div>
              <div className="p-2 text-xs">
                <p className="font-mono font-semibold">{p.reportNo}</p>
                <p className="truncate text-muted-foreground">
                  {[p.sido, p.sigungu].filter(Boolean).join(" ") || "지역 없음"}
                  {p.isHidden && " · 비공개 제보"}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
      {open !== null && (
        <PhotoLightbox items={items} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} onDecided={onDecided} />
      )}
    </>
  );
}
