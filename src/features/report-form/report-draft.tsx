"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MAX_PHOTOS } from "@/shared/constants";
import type { ProcessedPhoto } from "./image";

export type DraftPhoto = ProcessedPhoto & { id: string; previewUrl: string };
export type DraftLocation = { lat: number; lng: number; address: string | null };

type Draft = {
  photos: DraftPhoto[];
  location: DraftLocation | null;
  addPhotos(p: ProcessedPhoto[]): void;
  removePhoto(id: string): void;
  setLocation(l: DraftLocation): void;
  reset(): void;
};

const Ctx = createContext<Draft | null>(null);

/** Client-only wizard state shared by /report/* steps (lives in the report layout). */
export function ReportDraftProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [location, setLocation] = useState<DraftLocation | null>(null);

  const addPhotos = useCallback((list: ProcessedPhoto[]) => {
    setPhotos((prev) => [
      ...prev,
      ...list.slice(0, MAX_PHOTOS - prev.length).map((p) => ({
        ...p, id: crypto.randomUUID(), previewUrl: URL.createObjectURL(p.full),
      })),
    ]);
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const reset = useCallback(() => {
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    setLocation(null);
  }, []);

  // Warn before leaving the page with unsaved photos.
  useEffect(() => {
    if (photos.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [photos.length]);

  const value = useMemo(
    () => ({ photos, location, addPhotos, removePhoto, setLocation, reset }),
    [photos, location, addPhotos, removePhoto, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReportDraft() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useReportDraft must be used inside ReportDraftProvider");
  return ctx;
}
