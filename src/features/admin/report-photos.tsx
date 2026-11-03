"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PHOTO_MODERATION } from "@/shared/constants";
import { PhotoLightbox, type LightboxItem } from "./photo-lightbox";

export type ReportPhotoItem = LightboxItem & { thumbUrl: string };

export function ReportPhotos({ items: initial }: { items: ReportPhotoItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {items.map((p, i) => (
          <button key={p.photoId} onClick={() => setOpen(i)} className="overflow-hidden rounded-xl border bg-white text-left">
            <div className="aspect-square bg-muted">
              <img src={p.thumbUrl} alt="" className="size-full object-cover" />
            </div>
            <p className={cn("px-2 py-1.5 text-xs font-semibold",
              p.status === "approved" ? "text-emerald-700" : p.status === "private" ? "text-muted-foreground" : "text-amber-700")}>
              {PHOTO_MODERATION[p.status]}
            </p>
          </button>
        ))}
      </div>
      {open !== null && (
        <PhotoLightbox
          items={items}
          index={open}
          onIndexChange={setOpen}
          onClose={() => setOpen(null)}
          onDecided={(photoId, decision) => {
            setItems((prev) => prev.map((p) => (p.photoId === photoId ? { ...p, status: decision } : p)));
            router.refresh();
          }}
        />
      )}
    </>
  );
}
