"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapView, type RegionBubble } from "@/features/map/map-view";
import { SIDO_LIST } from "@/shared/constants";
import type { MapPoint } from "@/shared/types";
import { cn } from "@/lib/utils";

const KOREA_CENTER = { lat: 36.2, lng: 127.9 };

export function HomeMap({ points }: { points: MapPoint[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"all" | "region">("all");

  const bubbles = useMemo<RegionBubble[]>(() => {
    const counts = new Map<string, number>();
    points.forEach((p) => p.sido && counts.set(p.sido, (counts.get(p.sido) ?? 0) + 1));
    return SIDO_LIST.filter((s) => counts.has(s.name)).map((s) => ({
      key: s.name, count: counts.get(s.name)!, lat: s.lat, lng: s.lng,
    }));
  }, [points]);

  return (
    <MapView
      className="flex-1"
      initialCenter={KOREA_CENTER}
      initialLevel={13}
      cluster
      points={mode === "all" ? points : []}
      bubbles={mode === "region" ? bubbles : []}
      onPointClick={(p) => router.push(`/reports/${p.reportNo}`)}
      onBubbleClick={(b) => router.push(`/map?sido=${encodeURIComponent(b.key)}`)}
      showControls
    >
      <div className="absolute top-3 right-3 z-10 flex rounded-full bg-white p-1 text-sm shadow">
        {(["all", "region"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded-full px-3.5 py-1.5 font-semibold",
              mode === m ? "bg-primary text-white" : "text-muted-foreground",
            )}
          >
            {m === "all" ? "전체" : "지역별"}
          </button>
        ))}
      </div>
    </MapView>
  );
}
