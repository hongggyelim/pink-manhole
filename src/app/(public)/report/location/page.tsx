"use client";

import { MapPin, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { searchPlaces, type PlaceResult } from "@/features/map/kakao-loader";
import { MapView, type LatLng, type MapController } from "@/features/map/map-view";
import { PrimaryButton } from "@/features/report-form/primary-button";
import { useReportDraft } from "@/features/report-form/report-draft";
import { Stepper } from "@/features/report-form/stepper";
import { useRequireStep } from "@/features/report-form/use-require-step";

const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 };

type Geo = { state: "idle" | "loading" | "ok" | "outside"; address: string | null };

export default function LocationStep() {
  const router = useRouter();
  const ready = useRequireStep("location");
  const { location, setLocation } = useReportDraft();
  const mapRef = useRef<MapController>(null);
  const [center, setCenter] = useState<LatLng | null>(location);
  const [geo, setGeo] = useState<Geo>({ state: location ? "ok" : "idle", address: location?.address ?? null });
  const [notice, setNotice] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [initialCenter] = useState<LatLng>(() => location ?? SEOUL_CITY_HALL);

  // First visit: try the device location once.
  useEffect(() => {
    if (location || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => mapRef.current?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 3),
      () => setNotice("위치 권한이 없어요. 지도를 움직이거나 검색해서 위치를 지정해주세요."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [location]);

  // Reverse-geocode the pin position (debounced).
  useEffect(() => {
    if (!center) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setGeo((g) => ({ ...g, state: "loading" }));
      try {
        const res = await fetch(`/api/geocode?lat=${center.lat}&lng=${center.lng}`, { signal: ctrl.signal });
        if (res.status === 400) return setGeo({ state: "outside", address: null });
        const data = await res.json();
        setGeo({ state: "ok", address: data.roadAddress ?? data.address ?? null });
      } catch {
        if (!ctrl.signal.aborted) setGeo({ state: "ok", address: null });
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [center]);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setResults(await searchPlaces(query.trim()));
  }

  function pick(r: PlaceResult) {
    mapRef.current?.panTo({ lat: r.lat, lng: r.lng }, 3);
    setSearchOpen(false);
    setResults(null);
    setQuery("");
  }

  function next() {
    if (!center) return;
    setLocation({ ...center, address: geo.address });
    router.push("/report/confirm");
  }

  if (!ready) return null;

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="신고하기" backHref="/report/photo" />
      <Stepper current={2} />

      <MapView
        controllerRef={mapRef}
        className="h-[52dvh]"
        initialCenter={initialCenter}
        initialLevel={3}
        onIdle={(c) => setCenter(c)}
        showControls
      >
        {/* Fixed center pin: the map moves underneath it. */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center">
          <div className="mb-1 rounded-full bg-white px-3.5 py-2 text-sm font-semibold whitespace-nowrap shadow-md">
            현재 위치가 맞나요?
          </div>
          <MapPin className="size-10 fill-primary text-primary drop-shadow [&>circle]:fill-white [&>circle]:stroke-white" />
        </div>
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-0 size-28 -translate-1/2 rounded-full border border-primary/30 bg-primary/10" />
      </MapView>

      <div className="flex-1 px-5 pt-4">
        {notice && <p className="mb-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{notice}</p>}
        <div className="flex items-center gap-2">
          <MapPin className="size-5 shrink-0 fill-primary text-primary [&>circle]:fill-white [&>circle]:stroke-white" />
          <p className="flex-1 text-[15px] font-medium">
            {geo.state === "loading" && "주소 확인 중…"}
            {geo.state === "outside" && <span className="text-destructive">대한민국 내 위치만 등록할 수 있어요.</span>}
            {geo.state === "ok" && (geo.address ?? "주소를 찾을 수 없는 위치예요 (좌표로 등록돼요)")}
            {geo.state === "idle" && "지도를 움직여 위치를 맞춰주세요"}
          </p>
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className="shrink-0 rounded-full border px-3 py-1.5 text-sm text-muted-foreground"
          >
            위치 수정
          </button>
        </div>

        {searchOpen && (
          <div className="mt-3">
            <form onSubmit={runSearch} className="flex items-center gap-2 rounded-xl border px-3">
              <Search className="size-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="주소 또는 장소 검색"
                className="h-11 flex-1 bg-transparent text-base outline-none"
              />
              <button type="button" aria-label="닫기" onClick={() => setSearchOpen(false)}>
                <X className="size-4 text-muted-foreground" />
              </button>
            </form>
            {results && (
              <ul className="mt-2 max-h-48 divide-y overflow-y-auto rounded-xl border">
                {results.length === 0 && <li className="p-3 text-sm text-muted-foreground">검색 결과가 없어요.</li>}
                {results.map((r) => (
                  <li key={`${r.lat},${r.lng},${r.name}`}>
                    <button onClick={() => pick(r)} className="w-full p-3 text-left">
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.address}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="p-5">
        <PrimaryButton disabled={!center || geo.state === "outside" || geo.state === "loading"} onClick={next}>
          다음으로
        </PrimaryButton>
      </div>
    </main>
  );
}
