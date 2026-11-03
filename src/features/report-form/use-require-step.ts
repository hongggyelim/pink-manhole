"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useReportDraft } from "./report-draft";

/** Sends the user back to the first incomplete step (e.g. after a refresh). */
export function useRequireStep(step: "location" | "confirm") {
  const router = useRouter();
  const { photos, location } = useReportDraft();
  const missingPhotos = photos.length === 0;
  const missingLocation = step === "confirm" && !location;
  useEffect(() => {
    if (missingPhotos) router.replace("/report/photo");
    else if (missingLocation) router.replace("/report/location");
  }, [missingPhotos, missingLocation, router]);
  return !missingPhotos && !missingLocation;
}
