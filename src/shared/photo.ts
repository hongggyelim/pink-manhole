import { PHOTO_BUCKET } from "./constants";

export function photoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

/** Storage layout: {draftId}/{index}.jpg and {draftId}/{index}_thumb.jpg */
export function photoPaths(draftId: string, index: number) {
  return { full: `${draftId}/${index}.jpg`, thumb: `${draftId}/${index}_thumb.jpg` };
}
