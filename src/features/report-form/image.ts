import { PHOTO_MAX_BYTES } from "@/shared/constants";

export type ProcessedPhoto = { full: Blob; thumb: Blob; width: number; height: number };

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
 * Resizes + re-encodes to JPEG in the browser. Re-encoding through canvas drops
 * all EXIF metadata (GPS, device info), so nothing private leaves the device.
 */
export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("이 형식의 사진은 지원하지 않아요. JPG 또는 PNG 사진을 올려주세요.");
  }
  let full = await encode(bmp, 1600, 0.82);
  if (full.blob.size > PHOTO_MAX_BYTES) full = await encode(bmp, 1280, 0.7);
  const thumb = await encode(bmp, 400, 0.75);
  bmp.close();
  return { full: full.blob, thumb: thumb.blob, width: full.w, height: full.h };
}
