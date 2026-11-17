import { PHOTO_BUCKET } from "./constants";
import type { ReportPhoto } from "./types";

export function photoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

/** Storage layout (same path in either bucket): {draftId}/{i}.jpg, {i}_thumb.jpg (+ legacy {i}_blur.jpg) */
export function photoPaths(draftId: string, index: number) {
  return {
    full: `${draftId}/${index}.jpg`,
    thumb: `${draftId}/${index}_thumb.jpg`,
    blur: `${draftId}/${index}_blur.jpg`,
  };
}

/** Static pink tile shown in place of every photo that isn't approved (검토중 or 비공개). */
export const PHOTO_PLACEHOLDER = "/images/photo-placeholder.webp";

/**
 * What the public may see for a photo: the real image once approved, otherwise the placeholder
 * tile (the original stays in the private bucket, so 공개 ↔ 비공개 can switch at any time).
 */
export function publicPhoto(p: ReportPhoto) {
  if (p.moderation_status === "approved") {
    return { hidden: false as const, thumb: photoUrl(p.thumb_path), full: photoUrl(p.storage_path) };
  }
  return {
    hidden: true as const,
    label: p.moderation_status === "pending" ? "검토중" : "비공개",
    thumb: PHOTO_PLACEHOLDER,
    full: null,
  };
}
