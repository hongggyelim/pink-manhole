"use client";

import { PageHeader } from "@/components/layout/page-header";
import { searchPlaces, type PlaceResult } from "@/features/map/kakao-loader";
import {
  MapView,
  type LatLng,
  type MapController,
} from "@/features/map/map-view";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { MAX_PHOTOS, MEMO_MAX_LENGTH, UPLOAD_BUCKET } from "@/shared/constants";
import { ApiRoute, Route, withQuery } from "@/shared/routes";
import {
  Camera,
  Check,
  ChevronDown,
  ImageIcon,
  Info,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CameraDialog } from "./camera-dialog";
import { ConfirmDialog } from "./confirm-dialog";
import { processPhoto, type ProcessedPhoto } from "./image";
import { distanceMeters, lookupAddress, readPhotoGps } from "./photo-gps";
import { PrimaryButton } from "./primary-button";

type DraftPhoto = ProcessedPhoto & { id: string; previewUrl: string };
type LocationSource = "photo" | "search" | "current" | "map";
type DraftLocation = LatLng & {
  address: string | null;
  source: LocationSource;
  state: "loading" | "ok" | "outside";
};
type PhotoPrompt = LatLng & { address: string | null };

const SOURCE_LABEL: Record<LocationSource, string> = {
  photo: "사진 위치",
  search: "검색",
  current: "현재 위치",
  map: "지도에서 선택",
};
const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 };
/** Photo GPS closer than this to the chosen location is treated as "the same place". */
const SAME_PLACE_METERS = 30;

type SignResponse = {
  draftId: string;
  uploads: { path: string; token: string }[];
};

export function ReportForm() {
  const router = useRouter();
  const mapRef = useRef<MapController>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [location, setLocation] = useState<DraftLocation | null>(null);
  const [memo, setMemo] = useState("");
  const [memoOpen, setMemoOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoPrompt, setPhotoPrompt] = useState<PhotoPrompt | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const remaining = MAX_PHOTOS - photos.length;
  // Keep the uploaded draft so a retry after a failed create skips re-uploading.
  const uploadedDraft = useRef<string | null>(null);
  const geocodeCtrl = useRef<AbortController | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  /* ── Location ─────────────────────────────────────────────────────────── */

  const placeAt = useCallback(
    (p: LatLng, source: LocationSource, opts: { pan?: boolean } = {}) => {
      if (opts.pan !== false) mapRef.current?.panTo(p, 3);
      setLocation({ ...p, source, address: null, state: "loading" });
      geocodeCtrl.current?.abort();
      const ctrl = new AbortController();
      geocodeCtrl.current = ctrl;
      lookupAddress(p, ctrl.signal)
        .then((r) => {
          if (ctrl.signal.aborted) return;
          setLocation((cur) =>
            cur && cur.lat === p.lat && cur.lng === p.lng
              ? {
                  ...cur,
                  state: r.state,
                  address: r.state === "ok" ? r.address : null,
                }
              : cur
          );
        })
        .catch(() => {
          if (!ctrl.signal.aborted)
            setLocation((cur) => (cur ? { ...cur, state: "ok" } : cur));
        });
    },
    []
  );

  function locateMe() {
    setLocationNotice(null);
    if (!navigator.geolocation)
      return setLocationNotice("이 기기에서는 현재 위치를 사용할 수 없어요.");
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        placeAt(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          "current"
        ),
      () =>
        setLocationNotice(
          "위치 권한이 없어요. 주소를 검색하거나 지도를 움직여 지정해주세요."
        ),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      setResults(await searchPlaces(q));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function pickResult(r: PlaceResult) {
    placeAt({ lat: r.lat, lng: r.lng }, "search");
    setResults(null);
    setQuery("");
  }

  // The results list overlays the page; close it on an outside tap or Escape.
  useEffect(() => {
    if (!results) return;
    const onDown = (e: PointerEvent) => {
      if (!searchBoxRef.current?.contains(e.target as Node)) setResults(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setResults(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [results]);

  /* ── Photos ───────────────────────────────────────────────────────────── */

  async function onFiles(list: FileList | File[] | null) {
    const files = list ? [...list] : [];
    if (!files.length) return;
    setPhotoError(null);
    setBusy(true);
    uploadedDraft.current = null; // photo set changes → upload again on submit
    try {
      const picked = files.slice(0, remaining);
      if (files.length > remaining)
        setPhotoError(`사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요.`);
      // GPS is read from the ORIGINAL file (the compressed copy has no EXIF).
      const [processed, gpsList] = await Promise.all([
        Promise.all(picked.map(processPhoto)),
        Promise.all(picked.map(readPhotoGps)),
      ]);
      setPhotos((prev) => [
        ...prev,
        ...processed.slice(0, MAX_PHOTOS - prev.length).map((p) => ({
          ...p,
          id: crypto.randomUUID(),
          previewUrl: URL.createObjectURL(p.full),
        })),
      ]);
      const gps = gpsList.find(Boolean);
      if (gps) await offerPhotoLocation(gps);
    } catch (e) {
      setPhotoError((e as Error).message);
    } finally {
      setBusy(false);
      if (albumInputRef.current) albumInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  }

  async function offerPhotoLocation(gps: LatLng) {
    const current = locationRef.current;
    if (!current) {
      placeAt(gps, "photo");
      setLocationNotice(
        "사진에 담긴 위치로 설정했어요. 정확하지 않으면 지도를 움직여 조정해주세요."
      );
      return;
    }
    if (distanceMeters(current, gps) < SAME_PLACE_METERS) return;
    const r = await lookupAddress(gps).catch(() => ({
      state: "ok" as const,
      address: null,
    }));
    if (r.state === "outside") return;
    setPhotoPrompt({ ...gps, address: r.address });
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    uploadedDraft.current = null; // photo set changed → upload again
  }

  // Phones/tablets: OS camera app via <input capture>. Desktop: in-page webcam dialog.
  function openCamera() {
    if (window.matchMedia("(pointer: coarse)").matches)
      cameraInputRef.current?.click();
    else setCameraOpen(true);
  }

  // Revoke previews on unmount; warn before leaving with unsaved photos.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(
    () => () =>
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)),
    []
  );
  useEffect(() => {
    if (photos.length === 0 || submitting) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [photos.length, submitting]);

  /* ── Submit ───────────────────────────────────────────────────────────── */

  const canSubmit =
    photos.length > 0 && location?.state === "ok" && !busy && !submitting;

  async function submit() {
    if (!canSubmit || !location) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      let draftId = uploadedDraft.current;
      if (!draftId) {
        const signRes = await fetch(ApiRoute.Uploads, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: photos.length }),
        });
        const sign = await signRes.json();
        if (!signRes.ok)
          throw new Error(sign.error ?? "업로드 준비에 실패했어요.");
        const { draftId: id, uploads } = sign as SignResponse;
        const storage = createClient().storage.from(UPLOAD_BUCKET);
        await Promise.all(
          uploads.map(async (u, i) => {
            const { error } = await storage.uploadToSignedUrl(
              u.path,
              u.token,
              photos[i].full,
              {
                contentType: "image/jpeg",
              }
            );
            if (error)
              throw new Error(
                "사진 업로드에 실패했어요. 네트워크를 확인해주세요."
              );
          })
        );
        uploadedDraft.current = draftId = id;
      }

      const res = await fetch(ApiRoute.Reports, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          lat: location.lat,
          lng: location.lng,
          photoCount: photos.length,
          memo: memo.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "제보 등록에 실패했어요.");
      router.replace(withQuery(Route.Home, { submitted: 1 }));
    } catch (e) {
      setSubmitError((e as Error).message || "제보 등록에 실패했어요.");
      setSubmitting(false);
    }
  }

  /* ── UI ───────────────────────────────────────────────────────────────── */

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="신고하기" backHref={Route.Home} />

      <input
        ref={albumInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />

      <div className="flex-1 space-y-7 px-5 pt-2 pb-6">
        {/* 1. Photos */}
        <section aria-labelledby="photos-title">
          <SectionTitle
            id="photos-title"
            title="사진"
            required
            done={photos.length > 0}
            right={
              <span className="text-xs text-muted-foreground tabular-nums">
                {photos.length}/{MAX_PHOTOS}
              </span>
            }
          />
          <p className="mb-3 text-sm text-muted-foreground">
            맨홀의 상태와 위치를 알 수 있는 사진을 올려주세요.
          </p>
          {remaining > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={openCamera}
                className="flex h-12 items-center justify-center gap-1.5 rounded-lg bg-primary font-semibold text-white disabled:opacity-50"
              >
                <Camera className="size-5" /> 카메라로 촬영
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => albumInputRef.current?.click()}
                className="flex h-12 items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-pink-soft/40 font-semibold text-primary disabled:opacity-50"
              >
                <ImageIcon className="size-5" /> 앨범에서 선택
              </button>
            </div>
          )}
          <div
            className={cn(
              "grid grid-cols-3 gap-2",
              remaining > 0 && (photos.length > 0 || busy) && "mt-3"
            )}
          >
            {photos.map((p) => (
              <div
                key={p.id}
                className="relative aspect-square overflow-hidden rounded-xl bg-muted"
              >
                <img
                  src={p.previewUrl}
                  alt=""
                  className="size-full object-cover"
                />
                <button
                  aria-label="사진 삭제"
                  onClick={() => removePhoto(p.id)}
                  className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {busy && (
              <div className="flex aspect-square items-center justify-center rounded-xl bg-muted">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          {photoError && (
            <p className="mt-2 text-sm text-destructive">{photoError}</p>
          )}
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            사진은 관리자 검토 전까지 흐리게 공개돼요. 얼굴·차량 번호판이 나오지
            않게 찍어주세요. (JPG·PNG·WebP, 장당 10MB 이하)
          </p>
        </section>

        {/* 2. Location */}
        <section aria-labelledby="location-title">
          <SectionTitle
            id="location-title"
            title="위치"
            required
            done={location?.state === "ok"}
          />
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2.5">
            <MapPin className="size-5 shrink-0 fill-primary text-primary [&>circle]:fill-white [&>circle]:stroke-white" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">
                {!location && (
                  <span className="text-muted-foreground">
                    아직 위치를 지정하지 않았어요
                  </span>
                )}
                {location?.state === "loading" && "주소 확인 중…"}
                {location?.state === "outside" && (
                  <span className="text-destructive">
                    대한민국 내 위치만 등록할 수 있어요.
                  </span>
                )}
                {location?.state === "ok" &&
                  (location.address ?? (
                    <span className="tabular-nums">
                      위도 {location.lat.toFixed(5)}, 경도{" "}
                      {location.lng.toFixed(5)}
                    </span>
                  ))}
              </p>
              {location && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {SOURCE_LABEL[location.source]}
                </p>
              )}
            </div>
            <button
              onClick={locateMe}
              className="flex shrink-0 items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-sm text-muted-foreground"
            >
              <LocateFixed className="size-4" /> 현재 위치
            </button>
          </div>
          {locationNotice && (
            <p className="-mt-1 mb-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              {locationNotice}
            </p>
          )}
          <p className="mb-3 text-sm text-muted-foreground">
            주소를 검색하거나 지도에서 핀 위치를 설정해주세요.
          </p>
          <div ref={searchBoxRef} className="relative">
            <form
              onSubmit={runSearch}
              className="flex items-center gap-2 rounded-lg border px-3 focus-within:border-primary"
            >
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="주소 또는 장소 검색"
                enterKeyHint="search"
                className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none"
              />
              {query && (
                <button
                  type="button"
                  aria-label="검색어 지우기"
                  onClick={() => {
                    setQuery("");
                    setResults(null);
                  }}
                >
                  <X className="size-4 text-muted-foreground" />
                </button>
              )}
              <button className="shrink-0 rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white">
                {searching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "검색"
                )}
              </button>
            </form>
            {results && (
              <ul className="absolute inset-x-0 top-full z-30 mt-2 max-h-56 divide-y overflow-y-auto rounded-xl border bg-white shadow-lg">
                {results.length === 0 && (
                  <li className="p-3 text-sm text-muted-foreground">
                    검색 결과가 없어요.
                  </li>
                )}
                {results.map((r) => (
                  <li key={`${r.lat},${r.lng},${r.name}`}>
                    <button
                      onClick={() => pickResult(r)}
                      className="w-full p-3 text-left hover:bg-muted"
                    >
                      <p className="text-sm font-medium">{r.name}</p>
                      {r.address && (
                        <p className="text-xs text-muted-foreground">
                          {r.address}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="isolate mt-2 overflow-hidden rounded-xl border">
            <MapView
              controllerRef={mapRef}
              className="h-60"
              initialCenter={SEOUL_CITY_HALL}
              initialLevel={5}
              onDragEnd={(c) => placeAt(c, "map", { pan: false })}
              onLocate={(c) => placeAt(c, "current", { pan: false })}
              showControls
            >
              <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center">
                <div className="mb-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold whitespace-nowrap shadow-md">
                  {location
                    ? "핀을 맨홀 위치에 맞춰주세요"
                    : "지도를 움직여 위치를 지정하세요"}
                </div>
                <MapPin className="size-9 fill-primary text-primary drop-shadow [&>circle]:fill-white [&>circle]:stroke-white" />
              </div>
            </MapView>
          </div>
        </section>

        {/* 3. Memo (optional, collapsed by default) */}
        <section aria-labelledby="memo-title">
          <SectionTitle
            id="memo-title"
            title="메모"
            count={`${memo.length}/${MEMO_MAX_LENGTH}`}
            done={memo.trim().length > 0}
            right={
              <button
                type="button"
                onClick={() => setMemoOpen((o) => !o)}
                aria-expanded={memoOpen}
                aria-controls="memo-panel"
                aria-label={memoOpen ? "메모 닫기" : "메모 열기"}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <ChevronDown
                  className={cn(
                    "size-5 transition-transform duration-200",
                    memoOpen && "rotate-180"
                  )}
                />
              </button>
            }
          />
          {/* grid-rows 0fr→1fr animates height without measuring */}
          <div
            id="memo-panel"
            className={cn(
              "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
              memoOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            )}
          >
            <div className="overflow-hidden" inert={!memoOpen}>
              <textarea
                value={memo}
                onChange={(e) =>
                  setMemo(e.target.value.slice(0, MEMO_MAX_LENGTH))
                }
                rows={3}
                placeholder="예) 편의점 앞 횡단보도 옆, 가운데 금이 가 있어요"
                aria-label="메모"
                className="mt-1 w-full resize-none rounded-lg border p-3 text-base outline-none focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                메모는 제보와 함께 공개되니 개인정보는 적지 말아주세요.
              </p>
            </div>
          </div>
        </section>

        <div className="flex gap-3 rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-5 shrink-0" />
          <p>
            제보는 바로 등록돼요. 사진은 관리자 검토 전까지 흐리게 표시되고,
            승인 후 공개돼요. 제보자의 개인정보는 공개되지 않아요.
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {submitError && (
          <p className="mb-2 text-sm text-destructive">{submitError}</p>
        )}
        <PrimaryButton disabled={!canSubmit} onClick={submit}>
          {submitting ? "등록 중…" : "등록하기"}
        </PrimaryButton>
        {!canSubmit && !submitting && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {photos.length === 0 && !location
              ? "사진과 위치를 입력해주세요"
              : photos.length === 0
              ? "사진을 1장 이상 올려주세요"
              : !location || location.state === "outside"
              ? "위치를 지정해주세요"
              : location.state === "loading"
              ? "주소를 확인하는 중이에요"
              : ""}
          </p>
        )}
      </div>

      {cameraOpen && (
        <CameraDialog
          remaining={remaining}
          onCapture={(file) => onFiles([file])}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {photoPrompt && (
        <ConfirmDialog
          title="사진 위치를 적용할까요?"
          confirmLabel="적용"
          cancelLabel="지금 주소 유지"
          onCancel={() => setPhotoPrompt(null)}
          onConfirm={() => {
            placeAt(photoPrompt, "photo");
            setPhotoPrompt(null);
          }}
        >
          <p>
            이 주소(사진에 있는 위치)로 적용할까요?
            <br />
            <b className="text-foreground">
              {photoPrompt.address ??
                `${photoPrompt.lat.toFixed(5)}, ${photoPrompt.lng.toFixed(5)}`}
            </b>
          </p>
          {location?.address && (
            <p className="mt-2 text-xs">현재 입력된 주소: {location.address}</p>
          )}
        </ConfirmDialog>
      )}
    </main>
  );
}

function SectionTitle({
  id,
  title,
  required,
  done,
  count,
  right,
}: {
  id: string;
  title: string;
  required?: boolean;
  /** Field is filled → pink check badge next to the label. */
  done?: boolean;
  /** Shown right after the label, e.g. "0/200". */
  count?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-1 flex min-h-7 items-center justify-between gap-2">
      <h2 id={id} className="flex items-center gap-1.5 font-bold">
        {required && (
          <span className="text-primary" aria-hidden>
            *
          </span>
        )}
        {title}
        {count && (
          <span className="text-xs font-normal text-muted-foreground tabular-nums">
            {count}
          </span>
        )}
        {done && (
          <span
            role="img"
            aria-label="입력 완료"
            className="flex size-5 animate-in items-center justify-center rounded-full bg-primary text-white duration-200 zoom-in-50"
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        )}
      </h2>
      {right}
    </div>
  );
}
