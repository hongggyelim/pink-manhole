"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { cn } from "@/lib/utils";
import type { MapPoint } from "@/shared/types";
import { LocateFixed, Minus, Plus } from "lucide-react";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { loadKakao } from "./kakao-loader";

export type LatLng = { lat: number; lng: number };
export type MapController = {
  panTo(center: LatLng, level?: number): void;
};
export type RegionBubble = {
  key: string;
  count: number;
  lat: number;
  lng: number;
};

type Props = {
  initialCenter: LatLng;
  initialLevel?: number;
  points?: MapPoint[];
  cluster?: boolean;
  bubbles?: RegionBubble[];
  onPointClick?: (p: MapPoint) => void;
  onBubbleClick?: (b: RegionBubble) => void;
  onIdle?: (center: LatLng, level: number) => void;
  interactive?: boolean;
  showControls?: boolean;
  controllerRef?: Ref<MapController | null>;
  className?: string;
  children?: ReactNode;
};

const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.3 0 0 6.2 0 13.9 0 24.3 14 36 14 36s14-11.7 14-22.1C28 6.2 21.7 0 14 0z" fill="#e8578a"/><circle cx="14" cy="14" r="5.5" fill="#fff"/></svg>`;
const PIN_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  PIN_SVG
)}`;

const CLUSTER_STYLE = {
  width: "38px",
  height: "38px",
  lineHeight: "32px",
  textAlign: "center",
  background: "#e8578a",
  color: "#fff",
  fontWeight: "700",
  fontSize: "13px",
  borderRadius: "50%",
  border: "3px solid rgba(255,255,255,.9)",
  boxShadow: "0 2px 6px rgba(232,87,138,.45)",
};

/**
 * Map adapter. Everything Kakao-specific stays in src/features/map —
 * swapping providers means re-implementing this component only.
 */
export function MapView({
  initialCenter,
  initialLevel = 12,
  points,
  cluster = false,
  bubbles,
  onPointClick,
  onBubbleClick,
  onIdle,
  interactive = true,
  showControls = false,
  controllerRef,
  className,
  children,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const cb = useRef({ onPointClick, onBubbleClick, onIdle });
  const [status, setStatus] = useState<
    "loading" | "ready" | "no-key" | "error"
  >("loading");
  const initial = useRef({ initialCenter, initialLevel, interactive, cluster });

  useEffect(() => {
    cb.current = { onPointClick, onBubbleClick, onIdle };
  });

  useImperativeHandle(controllerRef, () => ({
    panTo(c, level) {
      const map = mapRef.current;
      if (!map) return;
      const kakao = window.kakao;
      if (level !== undefined) map.setLevel(level);
      map.panTo(new kakao.maps.LatLng(c.lat, c.lng));
    },
  }));

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | undefined;
    loadKakao()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;
        const {
          initialCenter: c,
          initialLevel: lv,
          interactive: inter,
          cluster: cl,
        } = initial.current;
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(c.lat, c.lng),
          level: lv,
          draggable: inter,
          scrollwheel: inter,
          disableDoubleClickZoom: !inter,
        });
        mapRef.current = map;
        if (cl) {
          clustererRef.current = new kakao.maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 7,
            gridSize: 60,
            styles: [CLUSTER_STYLE],
          });
        }
        kakao.maps.event.addListener(map, "idle", () => {
          const ctr = map.getCenter();
          cb.current.onIdle?.(
            { lat: ctr.getLat(), lng: ctr.getLng() },
            map.getLevel()
          );
        });
        ro = new ResizeObserver(() => map.relayout());
        ro.observe(containerRef.current);
        setStatus("ready");
      })
      .catch((e: Error) => {
        if (!cancelled) setStatus(e.message === "NO_KEY" ? "no-key" : "error");
      });
    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, []);

  // Sync point markers.
  useEffect(() => {
    if (status !== "ready") return;
    const kakao = window.kakao;
    const map = mapRef.current;
    markersRef.current.forEach((m) => m.setMap(null));
    clustererRef.current?.clear();
    const image = new kakao.maps.MarkerImage(
      PIN_URL,
      new kakao.maps.Size(28, 36),
      {
        offset: new kakao.maps.Point(14, 36),
      }
    );
    markersRef.current = (points ?? []).map((p) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(p.lat, p.lng),
        image,
      });
      kakao.maps.event.addListener(marker, "click", () =>
        cb.current.onPointClick?.(p)
      );
      return marker;
    });
    if (clustererRef.current)
      clustererRef.current.addMarkers(markersRef.current);
    else markersRef.current.forEach((m) => m.setMap(map));
  }, [status, points]);

  // Sync region count bubbles.
  useEffect(() => {
    if (status !== "ready") return;
    const kakao = window.kakao;
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = (bubbles ?? []).map((b) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className =
        "flex flex-col items-center justify-center rounded-full bg-primary/90 text-white shadow-md border-2 border-white";
      const size = Math.min(64, 36 + Math.log2(b.count + 1) * 6);
      el.style.width = el.style.height = `${size}px`;
      el.innerHTML = `<span style="font-size:10px;line-height:1">${b.key}</span><span style="font-size:13px;font-weight:700;line-height:1.2">${b.count}</span>`;
      el.onclick = () => cb.current.onBubbleClick?.(b);
      return new kakao.maps.CustomOverlay({
        map: mapRef.current,
        position: new kakao.maps.LatLng(b.lat, b.lng),
        content: el,
        yAnchor: 0.5,
      });
    });
  }, [status, bubbles]);

  function zoom(delta: number) {
    const map = mapRef.current;
    map?.setLevel(map.getLevel() + delta, { animate: true });
  }

  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const map = mapRef.current;
        if (!map) return;
        map.setLevel(4);
        map.panTo(
          new window.kakao.maps.LatLng(
            pos.coords.latitude,
            pos.coords.longitude
          )
        );
      },
      () =>
        alert(
          "위치 정보를 가져올 수 없어요. 브라우저의 위치 권한을 확인해주세요."
        ),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-[#eef1f4]", className)}>
      <div ref={containerRef} className="absolute inset-0" />
      {status !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
          {status === "loading" && "지도를 불러오는 중…"}
          {status === "no-key" &&
            "지도 API 키(NEXT_PUBLIC_KAKAO_JS_KEY)가 설정되지 않았어요."}
          {status === "error" && (
            <span>
              지도를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
              {process.env.NODE_ENV === "development" && (
                <span className="mt-2 block text-xs">
                  [개발] Kakao Developers → 플랫폼 → Web 사이트 도메인에{" "}
                  <b>{window.location.origin}</b> 이 등록되어 있는지 확인하세요.
                </span>
              )}
            </span>
          )}
        </div>
      )}
      {status === "ready" && children}
      {status === "ready" && showControls && (
        <div className="absolute right-3 bottom-4 z-10 flex flex-col gap-2">
          <MapButton label="내 위치" onClick={locate}>
            <LocateFixed className="size-5" />
          </MapButton>
          <div className="flex flex-col overflow-hidden rounded-full bg-white shadow">
            <button
              aria-label="확대"
              className="p-2.5"
              onClick={() => zoom(-1)}
            >
              <Plus className="size-5" />
            </button>
            <div className="mx-2 h-px bg-border" />
            <button aria-label="축소" className="p-2.5" onClick={() => zoom(1)}>
              <Minus className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MapButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="rounded-full bg-white p-2.5 shadow"
    >
      {children}
    </button>
  );
}
