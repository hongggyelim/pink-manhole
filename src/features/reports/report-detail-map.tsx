"use client";

import { MapView } from "@/features/map/map-view";

export function ReportDetailMap({ id, reportNo, lat, lng }: { id: string; reportNo: string; lat: number; lng: number }) {
  return (
    <MapView
      className="h-64"
      initialCenter={{ lat, lng }}
      initialLevel={3}
      points={[{ id, reportNo, lat, lng, sido: null }]}
    />
  );
}
