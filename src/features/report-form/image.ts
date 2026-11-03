import { PHOTO_INPUT_MAX_BYTES, PHOTO_MAX_BYTES } from "@/shared/constants";

export type ProcessedPhoto = { full: Blob; width: number; height: number };

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", ""];

function encode(bmp: ImageBitmap, maxSide: number, quality: number) {
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  return new Promise<{ blob: Blob; w: number; h: number }>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve({ blob: b, w, h }) : reject(new Error("encode failed"))), "image/jpeg", quality),
  );
}

/**
 * Resizes + re-encodes to JPEG in the browser to keep uploads small (and drops EXIF).
 * This is a convenience only — the server re-validates and re-encodes every file.
 */
export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  if (file.size > PHOTO_INPUT_MAX_BYTES) throw new Error("사진 한 장의 크기는 10MB 이하여야 해요.");
  if (!ACCEPTED.includes(file.type)) throw new Error("JPG, PNG, WebP 사진만 올릴 수 있어요.");
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("이 형식의 사진은 지원하지 않아요. JPG, PNG, WebP 사진을 올려주세요.");
  }
  let full = await encode(bmp, 1600, 0.82);
  if (full.blob.size > PHOTO_MAX_BYTES) full = await encode(bmp, 1280, 0.7);
  bmp.close();
  return { full: full.blob, width: full.w, height: full.h };
}
