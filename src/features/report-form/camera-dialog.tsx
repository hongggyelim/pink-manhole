"use client";

import { Camera, SwitchCamera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  remaining: number;
  onCapture: (file: File) => void;
  onClose: () => void;
};

/**
 * In-page camera for devices without a native camera picker (desktop webcams).
 * Phones use <input capture> instead, which opens the OS camera app (better focus/flash).
 * getUserMedia needs a secure context: https or localhost.
 */
export function CameraDialog({ remaining, onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      const t = setTimeout(() =>
        setError(
          window.isSecureContext
            ? "이 브라우저는 카메라를 지원하지 않아요. 사진 파일로 올려주세요."
            : "카메라는 보안 연결(https)에서만 사용할 수 있어요. 사진 파일로 올려주세요.",
        ),
      );
      return () => clearTimeout(t);
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        video.onloadedmetadata = () => {
          video.play().catch(() => {});
          setReady(true);
        };
      })
      .catch((e: DOMException) => {
        if (cancelled) return;
        setError(
          e.name === "NotAllowedError"
            ? "카메라 권한이 거부됐어요. 브라우저 설정에서 카메라를 허용하거나 사진 파일로 올려주세요."
            : e.name === "NotFoundError"
              ? "사용할 수 있는 카메라가 없어요. 사진 파일로 올려주세요."
              : "카메라를 켤 수 없어요. 사진 파일로 올려주세요.",
        );
      });
    return () => {
      cancelled = true;
      setReady(false);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function shoot() {
    const video = videoRef.current;
    if (!video || !ready || remaining <= 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
        onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
        if (remaining <= 1) onClose();
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div role="dialog" aria-modal aria-label="카메라로 촬영" className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <span className="text-sm text-white/70">남은 사진 {remaining}장</span>
        <button aria-label="닫기" onClick={onClose} className="rounded-full p-2 hover:bg-white/10">
          <X className="size-6" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <video ref={videoRef} playsInline muted className="absolute inset-0 size-full object-contain" />
        {flash && <div className="absolute inset-0 bg-white/70" />}
        {!ready && !error && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white/70">카메라를 켜는 중…</p>
        )}
        {error && <p className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm">{error}</p>}
      </div>
      <div className="flex items-center justify-center gap-10 px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <span className="size-11" />
        <button
          aria-label="촬영"
          disabled={!ready || remaining <= 0}
          onClick={shoot}
          className="flex size-18 items-center justify-center rounded-full border-4 border-white bg-primary disabled:opacity-40"
        >
          <Camera className="size-7" />
        </button>
        <button
          aria-label="카메라 전환"
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          className="flex size-11 items-center justify-center rounded-full bg-white/15"
        >
          <SwitchCamera className="size-5" />
        </button>
      </div>
    </div>
  );
}
