import "server-only";
import sharp, { type Metadata } from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PHOTO_BUCKET, UPLOAD_BUCKET } from "@/shared/constants";
import { photoPaths } from "@/shared/photo";
import type { PhotoModeration } from "@/shared/constants";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const MAX_INPUT_PIXELS = 50_000_000;

export class PhotoError extends Error {}

/**
 * Server-side authority for uploads: whatever the client sent, we decode it with sharp
 * (rejects non-images by actual content), then re-encode. sharp drops all metadata
 * (EXIF/GPS) unless asked to keep it.
 */
export async function processUploadedPhoto(input: Buffer) {
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new PhotoError("이미지 파일이 아니에요.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new PhotoError("JPG, PNG, WebP 사진만 올릴 수 있어요.");
  }
  // The three encodes run in parallel on libvips' thread pool. Plain libjpeg (no mozjpeg):
  // mozjpeg was ~4x slower for a few % smaller files.
  const base = () => sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).rotate();
  const [{ data: full, info }, thumb, blur] = await Promise.all([
    base()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer({ resolveWithObject: true }),
    base().resize(400, 400, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer(),
    // Tiny downscale first so nothing recognisable survives, then upscale + blur.
    base().resize(24).resize(400).blur(12).jpeg({ quality: 60 }).toBuffer(),
  ]);
  return { full, thumb, blur, width: info.width, height: info.height };
}

type FileKind = "full" | "thumb" | "blur";

/** Which bucket each file of a photo should live in, given moderation + report visibility. */
export function desiredBuckets(moderation: PhotoModeration, reportVisible: boolean): Record<FileKind, string> {
  const showReal = reportVisible && moderation === "approved";
  return {
    full: showReal ? PHOTO_BUCKET : UPLOAD_BUCKET,
    thumb: showReal ? PHOTO_BUCKET : UPLOAD_BUCKET,
    // Blur previews are no longer published (the public UI draws a placeholder). Keeping the
    // kind here moves blurs published before that change back to the private bucket.
    blur: UPLOAD_BUCKET,
  };
}

/**
 * Idempotently moves a report's files into the buckets they should be in.
 * `client` must have storage rights on both buckets (admin session via storage RLS,
 * or the secret-key client during report creation).
 */
export async function syncReportFiles(client: SupabaseClient, reportId: string) {
  const { data: report, error } = await client
    .from("reports")
    .select("is_hidden, deleted_at, report_photos(storage_path, thumb_path, blur_path, moderation_status)")
    .eq("id", reportId)
    .single();
  if (error) throw error;
  const visible = !report.is_hidden && !report.deleted_at;

  const moves: Promise<void>[] = [];
  for (const p of report.report_photos) {
    const want = desiredBuckets(p.moderation_status as PhotoModeration, visible);
    const files: [FileKind, string | null][] = [["full", p.storage_path], ["thumb", p.thumb_path], ["blur", p.blur_path]];
    for (const [kind, path] of files) {
      if (!path) continue;
      const target = want[kind];
      const source = target === PHOTO_BUCKET ? UPLOAD_BUCKET : PHOTO_BUCKET;
      moves.push(
        client.storage
          .from(source)
          .move(path, path, { destinationBucket: target })
          .then(({ error: mvErr }) => {
            // "not found" = already in the right bucket.
            if (mvErr && !/not.?found/i.test(mvErr.message)) throw mvErr;
          }),
      );
    }
  }
  await Promise.all(moves);
}

/** Download → validate/re-encode → write processed files to the private bucket. */
export async function processDraftPhotos(admin: SupabaseClient, draftId: string, count: number) {
  const storage = admin.storage.from(UPLOAD_BUCKET);
  // Photos are processed in parallel (≤ MAX_PHOTOS), order preserved by index.
  return Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const paths = photoPaths(draftId, i);
      const { data: blob, error } = await storage.download(paths.full);
      if (error || !blob) throw new PhotoError("업로드된 사진을 찾을 수 없어요.");
      const processed = await processUploadedPhoto(Buffer.from(await blob.arrayBuffer()));
      const uploads = await Promise.all([
        storage.upload(paths.full, processed.full, { contentType: "image/jpeg", upsert: true }),
        storage.upload(paths.thumb, processed.thumb, { contentType: "image/jpeg", upsert: true }),
        storage.upload(paths.blur, processed.blur, { contentType: "image/jpeg", upsert: true }),
      ]);
      const failed = uploads.find((u) => u.error);
      if (failed?.error) throw failed.error;
      return {
        storage_path: paths.full,
        thumb_path: paths.thumb,
        blur_path: paths.blur,
        width: processed.width,
        height: processed.height,
      };
    }),
  );
}
