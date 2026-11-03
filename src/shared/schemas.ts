import { z } from "zod";
import { KOREA_BOUNDS, MAX_PHOTOS } from "./constants";

export const latLngSchema = z.object({
  lat: z.number().min(KOREA_BOUNDS.minLat).max(KOREA_BOUNDS.maxLat),
  lng: z.number().min(KOREA_BOUNDS.minLng).max(KOREA_BOUNDS.maxLng),
});

export const signUploadSchema = z.object({
  count: z.number().int().min(1).max(MAX_PHOTOS),
});

export const createReportSchema = latLngSchema.extend({
  draftId: z.uuid(),
  photos: z
    .array(
      z.object({
        width: z.number().int().positive().max(10000),
        height: z.number().int().positive().max(10000),
      }),
    )
    .min(1)
    .max(MAX_PHOTOS),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const reportNoSchema = z.string().regex(/^PM-\d{6}-[2-9A-HJ-NP-Z]{4}$/);
