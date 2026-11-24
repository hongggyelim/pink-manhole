"use client";

import { Check, EyeOff, Hourglass, Loader2, ZoomIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { moderatePhoto } from "@/server/admin-actions";
import { PHOTO_MODERATION, type PhotoModeration } from "@/shared/constants";
import { PhotoLightbox, type LightboxItem } from "./photo-lightbox";

export type ReportPhotoItem = LightboxItem & { thumbUrl: string };

/** Photos stacked one per row, each with its own 검토중 / 승인 / 비공개 toggle. Click a photo to zoom. */
export function ReportPhotos({ items: initial }: { items: ReportPhotoItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState<number | null>(null);

  const onDecided = (photoId: string, decision: PhotoModeration) => {
    setItems((prev) => prev.map((p) => (p.photoId === photoId ? { ...p, status: decision } : p)));
    // Report status, activity log and photo URLs (public ↔ signed) all change on the server.
    router.refresh();
  };

  if (!items.length) return <p className="text-sm text-muted-foreground">사진이 없어요.</p>;

  return (
    <>
      <div className="flex flex-col gap-4">
        {items.map((p, i) => (
          <figure key={p.photoId} className="overflow-hidden rounded-xl border bg-white">
            <button onClick={() => setOpen(i)} className="group relative block w-full bg-muted" aria-label={`사진 ${i + 1} 크게 보기`}>
              <img src={p.fullUrl} alt={`사진 ${i + 1}`} className="mx-auto max-h-[70vh] w-full object-contain" />
              <span className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition group-hover:opacity-100">
                <ZoomIn className="size-4" />
              </span>
            </button>
            <figcaption className="flex flex-wrap items-center gap-2 p-3">
              <span className="text-sm font-semibold">사진 {i + 1}</span>
              <div className="flex-1" />
              <ModerationToggle photoId={p.photoId} status={p.status} onDecided={onDecided} />
            </figcaption>
          </figure>
        ))}
      </div>
      {open !== null && (
        <PhotoLightbox items={items} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} onDecided={onDecided} />
      )}
    </>
  );
}

const OPTIONS: { value: PhotoModeration; icon: typeof Check; active: string }[] = [
  { value: "pending", icon: Hourglass, active: "bg-amber-100 text-amber-800" },
  { value: "approved", icon: Check, active: "bg-emerald-600 text-white" },
  { value: "private", icon: EyeOff, active: "bg-neutral-700 text-white" },
];

function ModerationToggle({
  photoId,
  status,
  onDecided,
}: {
  photoId: string;
  status: PhotoModeration;
  onDecided: (photoId: string, decision: PhotoModeration) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<PhotoModeration | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = (decision: PhotoModeration) => {
    if (pending || decision === status) return;
    setError(null);
    setTarget(decision);
    startTransition(async () => {
      const res = await moderatePhoto(photoId, decision);
      setTarget(null);
      if (!res.ok) return setError(res.error);
      onDecided(photoId, decision);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div role="radiogroup" aria-label="사진 검토" className="inline-flex rounded-lg border bg-muted p-0.5">
        {OPTIONS.map(({ value, icon: Icon, active }) => {
          const selected = status === value;
          return (
            <button
              key={value}
              role="radio"
              aria-checked={selected}
              disabled={pending}
              onClick={() => decide(value)}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition disabled:cursor-wait",
                selected ? active : "text-muted-foreground hover:bg-white",
              )}
            >
              {target === value ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
              {PHOTO_MODERATION[value]}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
