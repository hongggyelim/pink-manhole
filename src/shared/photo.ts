import { PHOTO_BUCKET } from "./constants";
import type { ReportPhoto } from "./types";

export function photoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

/** Storage layout (same path in either bucket): {draftId}/{i}.jpg, {i}_thumb.jpg, {i}_blur.jpg */
export function photoPaths(draftId: string, index: number) {
  return {
    full: `${draftId}/${index}.jpg`,
    thumb: `${draftId}/${index}_thumb.jpg`,
    blur: `${draftId}/${index}_blur.jpg`,
  };
}

/**
 * Static stand-in (pink manhole on gray) for a report whose photos are all 비공개 (private).
 * RLS hides private photos, so on the public side such a report has an empty `report_photos`.
 */
export const PRIVATE_PHOTO_PLACEHOLDER = "/images/photo-private.webp";

/** What the public may see for a photo: the real image once approved, otherwise the blur preview. */
export function publicPhoto(p: ReportPhoto) {
  if (p.moderation_status === "approved") {
    return { blurred: false, thumb: photoUrl(p.thumb_path), full: photoUrl(p.storage_path) };
  }
  const blur = p.blur_path ? photoUrl(p.blur_path) : null;
  return { blurred: true, thumb: blur, full: null };
}
