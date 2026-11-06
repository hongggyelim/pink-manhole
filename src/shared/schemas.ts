import { z } from "zod";
import { KOREA_BOUNDS, MAX_PHOTOS, MEMO_MAX_LENGTH } from "./constants";

export const latLngSchema = z.object({
  lat: z.number().min(KOREA_BOUNDS.minLat).max(KOREA_BOUNDS.maxLat),
  lng: z.number().min(KOREA_BOUNDS.minLng).max(KOREA_BOUNDS.maxLng),
});

export const signUploadSchema = z.object({
  count: z.number().int().min(1).max(MAX_PHOTOS),
});

export const createReportSchema = latLngSchema.extend({
  draftId: z.uuid(),
  photoCount: z.number().int().min(1).max(MAX_PHOTOS),
  /** Optional location memo: control chars stripped, whitespace collapsed. */
  memo: z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(MEMO_MAX_LENGTH))
    .optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const reportNoSchema = z.string().regex(/^PM-\d{6}-[2-9A-HJ-NP-Z]{4}$/);

export const adminPhotoDecisionSchema = z.object({
  photoId: z.uuid(),
  decision: z.enum(["pending", "approved", "private"]), // pending = 검토 취소
});
export const adminReportIdSchema = z.uuid();
