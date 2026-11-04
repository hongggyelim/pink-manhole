"use client";

import { ApiRoute, withQuery } from "@/shared/routes";
import { KOREA_BOUNDS } from "@/shared/constants";
import type { LatLng } from "@/features/map/map-view";

/**
 * Reads GPS coordinates from a photo's EXIF, ON THE DEVICE ONLY. The coordinates are used to
 * pre-fill the report location; the uploaded file itself is re-encoded without EXIF.
 * Note: many phones/browsers strip location from photos picked via a web file input.
 */
export async function readPhotoGps(file: File): Promise<LatLng | null> {
  try {
    const exifr = (await import("exifr")).default;
    const gps = await exifr.gps(file);
    if (!gps || !Number.isFinite(gps.latitude) || !Number.isFinite(gps.longitude)) return null;
    const { latitude: lat, longitude: lng } = gps;
    const b = KOREA_BOUNDS;
    if (lat < b.minLat || lat > b.maxLat || lng < b.minLng || lng > b.maxLng) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/** Great-circle distance in meters. */
export function distanceMeters(a: LatLng, b: LatLng) {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type GeocodeOutcome = { state: "ok"; address: string | null } | { state: "outside" };

/** Address for a point via our server proxy (keeps the Kakao REST key server-side). */
export async function lookupAddress(p: LatLng, signal?: AbortSignal): Promise<GeocodeOutcome> {
  const res = await fetch(withQuery(ApiRoute.Geocode, { lat: p.lat, lng: p.lng }), { signal });
  if (res.status === 400) return { state: "outside" };
  if (!res.ok) return { state: "ok", address: null };
  const data = await res.json();
  return { state: "ok", address: data.roadAddress ?? data.address ?? null };
}
