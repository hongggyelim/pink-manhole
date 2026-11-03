"use client";

import { List } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MapView, type MapController } from "@/features/map/map-view";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { SIDO_LIST } from "@/shared/constants";
import type { MapPoint, PublicReport } from "@/shared/types";
import { ReportListItem } from "./report-list-item";

const KOREA = { lat: 36.2, lng: 127.9, level: 13 };
const LIST_COLUMNS =
  "id, report_no, status, lat, lng, address, road_address, sido, sigungu, created_at, report_photos(storage_path, thumb_path, width, height, sort_order)";

export function MapExplorer({ points }: { points: MapPoint[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const mapRef = useRef<MapController>(null);
  const [sido, setSido] = useState<string | null>(sp.get("sido"));
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<{ sido: string | null; items: PublicReport[] } | null>(null);

  const focusLat = Number(sp.get("lat"));
  const focusLng = Number(sp.get("lng"));
  const hasFocus = Number.isFinite(focusLat) && Number.isFinite(focusLng) && sp.get("lat") !== null;
  const initialSido = SIDO_LIST.find((s) => s.name === sp.get("sido"));
  const initialCenter = hasFocus
    ? { lat: focusLat, lng: focusLng }
    : initialSido ?? KOREA;
  const initialLevel = hasFocus ? 3 : initialSido?.level ?? KOREA.level;

  function selectSido(name: string | null) {
    setSido(name);
    const s = SIDO_LIST.find((x) => x.name === name);
    mapRef.current?.panTo(s ?? KOREA, s?.level ?? KOREA.level);
    router.replace(name ? `/map?sido=${encodeURIComponent(name)}` : "/map", { scroll: false });
  }

  // Load the list when the sheet opens (public read via RLS).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let q = createClient()
      .from("reports")
      .select(LIST_COLUMNS)
      .order("created_at", { ascending: false })
      .order("sort_order", { referencedTable: "report_photos" })
      .limit(100);
    if (sido) q = q.eq("sido", sido);
    q.then(({ data }) => !cancelled && setList({ sido, items: (data as PublicReport[]) ?? [] }));
    return () => {
      cancelled = true;
    };
  }, [open, sido]);

  const items = list && list.sido === sido ? list.items : null;
  const count = sido ? points.filter((p) => p.sido === sido).length : points.length;

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        {[null, ...SIDO_LIST.map((s) => s.name)].map((name) => (
          <button
            key={name ?? "all"}
            onClick={() => selectSido(name)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
              sido === name ? "border-primary bg-primary text-white" : "bg-white text-muted-foreground",
            )}
          >
            {name ?? "전국"}
          </button>
        ))}
      </div>
      <MapView
        controllerRef={mapRef}
        className="flex-1"
        initialCenter={initialCenter}
        initialLevel={initialLevel}
        cluster
        points={points}
        onPointClick={(p) => router.push(`/reports/${p.reportNo}`)}
        showControls
      >
        <button
          onClick={() => setOpen(true)}
          className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
        >
          <List className="size-4" /> {sido ?? "전국"} 제보 {count.toLocaleString()}건 목록
        </button>
      </MapView>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-h-[75dvh] max-w-[480px] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{sido ?? "전국"} 제보 목록</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-6">
            {items === null && <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중…</p>}
            {items?.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">아직 제보가 없어요.</p>
            )}
            <div className="divide-y">
              {items?.map((r) => <ReportListItem key={r.id} report={r} />)}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
