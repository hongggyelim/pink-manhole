"use client";

import { ChevronRight, Info, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PrimaryButton } from "@/features/report-form/primary-button";
import { useReportDraft } from "@/features/report-form/report-draft";
import { Stepper } from "@/features/report-form/stepper";
import { useRequireStep } from "@/features/report-form/use-require-step";
import { createClient } from "@/lib/supabase/client";
import { PHOTO_BUCKET } from "@/shared/constants";

type UploadTarget = { path: string; token: string };
type SignResponse = { draftId: string; uploads: { full: UploadTarget; thumb: UploadTarget }[] };

export default function ConfirmStep() {
  const router = useRouter();
  const ready = useRequireStep("confirm");
  const { photos, location, reset } = useReportDraft();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keep the uploaded draft so a retry after a failed create skips re-uploading.
  const uploadedDraft = useRef<string | null>(null);

  async function submit() {
    if (!location || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      let draftId = uploadedDraft.current;
      if (!draftId) {
        const signRes = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: photos.length }),
        });
        const sign = await signRes.json();
        if (!signRes.ok) throw new Error(sign.error ?? "업로드 준비에 실패했어요.");
        const { draftId: id, uploads } = sign as SignResponse;
        const storage = createClient().storage.from(PHOTO_BUCKET);
        await Promise.all(
          uploads.flatMap((u, i) => [
            storage.uploadToSignedUrl(u.full.path, u.full.token, photos[i].full, { contentType: "image/jpeg" }),
            storage.uploadToSignedUrl(u.thumb.path, u.thumb.token, photos[i].thumb, { contentType: "image/jpeg" }),
          ]).map(async (p) => {
            const { error } = await p;
            if (error) throw new Error("사진 업로드에 실패했어요. 네트워크를 확인해주세요.");
          }),
        );
        uploadedDraft.current = draftId = id;
      }

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          lat: location.lat,
          lng: location.lng,
          photos: photos.map((p) => ({ width: p.width, height: p.height })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "제보 등록에 실패했어요.");
      reset();
      router.replace(`/report/complete?no=${encodeURIComponent(data.reportNo)}`);
    } catch (e) {
      setError((e as Error).message || "제보 등록에 실패했어요.");
      setSubmitting(false);
    }
  }

  if (!ready || !location) return null;

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="신고하기" backHref="/report/location" />
      <Stepper current={3} />

      <div className="flex-1 space-y-3 px-5">
        <Link href="/report/photo" className="flex items-center gap-4 rounded-2xl border p-3">
          <img src={photos[0].previewUrl} alt="" className="size-16 rounded-xl object-cover" />
          <span className="flex-1 font-semibold">사진 {photos.length}장</span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Link href="/report/location" className="flex items-center gap-3 rounded-2xl border p-5">
          <MapPin className="size-5 shrink-0 fill-primary text-primary [&>circle]:fill-white [&>circle]:stroke-white" />
          <span className="flex-1 font-semibold">{location.address ?? "지도에서 지정한 위치"}</span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <div className="flex gap-3 rounded-2xl bg-muted p-5 text-sm leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-5 shrink-0" />
          <p>
            제보한 내용은 바로 지도에 공개돼요. 제보자의 개인정보는 공개되지 않으며, 부적절한 제보는 관리자가 숨길 수
            있어요.
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="p-5">
        <PrimaryButton disabled={submitting} onClick={submit}>
          {submitting ? "제출 중…" : "제출하기"}
        </PrimaryButton>
      </div>
    </main>
  );
}
