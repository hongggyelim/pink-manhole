"use client";

import { Camera, ImageIcon, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CameraDialog } from "@/features/report-form/camera-dialog";
import { processPhoto } from "@/features/report-form/image";
import { PrimaryButton } from "@/features/report-form/primary-button";
import { useReportDraft } from "@/features/report-form/report-draft";
import { Stepper } from "@/features/report-form/stepper";
import { MAX_PHOTOS } from "@/shared/constants";

export default function PhotoStep() {
  const router = useRouter();
  const { photos, addPhotos, removePhoto } = useReportDraft();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = MAX_PHOTOS - photos.length;

  async function onFiles(list: FileList | File[] | null) {
    const files = list ? [...list] : [];
    if (!files.length) return;
    setError(null);
    setBusy(true);
    try {
      const picked = [...files].slice(0, remaining);
      if (files.length > remaining) setError(`사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요.`);
      addPhotos(await Promise.all(picked.map(processPhoto)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  }

  // Phones/tablets: the OS camera app via <input capture>. Desktop: in-page webcam dialog.
  function openCamera() {
    if (window.matchMedia("(pointer: coarse)").matches) cameraInputRef.current?.click();
    else setCameraOpen(true);
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="신고하기" backHref="/home" />
      <Stepper current={1} />
      <input
        ref={inputRef}
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

      <div className="flex-1 px-5">
        <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-pink-soft/50 px-5 pt-8 pb-5 text-center">
          <Camera className="mx-auto size-9 text-primary" />
          <p className="mt-3 text-lg font-bold">{busy ? "사진 처리 중…" : "사진을 업로드해주세요"}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            분홍색 맨홀을 촬영한 사진을 올려주세요.
            <br />(최대 {MAX_PHOTOS}장까지)
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={remaining === 0 || busy}
              onClick={openCamera}
              className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-primary font-semibold text-white disabled:opacity-50"
            >
              <Camera className="size-5" /> 카메라로 촬영
            </button>
            <button
              type="button"
              disabled={remaining === 0 || busy}
              onClick={() => inputRef.current?.click()}
              className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-white font-semibold text-primary disabled:opacity-50"
            >
              <ImageIcon className="size-5" /> 앨범에서 선택
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
              <img src={p.previewUrl} alt="" className="size-full object-cover" />
              <button
                aria-label="사진 삭제"
                onClick={() => removePhoto(p.id)}
                className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {remaining > 0 && photos.length > 0 && (
            <button
              aria-label="사진 추가"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-xl border text-muted-foreground"
            >
              <Plus className="size-7" />
            </button>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          사진은 관리자 검토 전까지 흐리게 공개되고, 승인 후 원본이 공개돼요. 사람 얼굴이나 차량 번호판이 나오지 않게 촬영해주세요. (JPG·PNG·WebP, 장당 10MB 이하)
        </p>
      </div>

      {cameraOpen && (
        <CameraDialog
          remaining={remaining}
          onCapture={(file) => onFiles([file])}
          onClose={() => setCameraOpen(false)}
        />
      )}

      <div className="p-5">
        <PrimaryButton disabled={photos.length === 0 || busy} onClick={() => router.push("/report/location")}>
          다음으로
        </PrimaryButton>
      </div>
    </main>
  );
}
