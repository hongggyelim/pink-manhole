import { Suspense } from "react";
import { PhotoReviewQueue, type QueueItem } from "@/features/admin/photo-review-queue";
import { requireAdminPage } from "@/server/auth";
import { getAdminPhotoUrls, getPendingPhotos } from "@/server/services/admin";

export const metadata = { title: "사진 검토" };

export default function PhotosPage() {
  return (
    <>
      <h1 className="text-xl font-bold">사진 검토 대기</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        사진을 눌러 크게 보고 승인 또는 비공개를 선택하세요. 승인한 사진만 원본으로 공개되고, 그 전까지는 흐리게 표시돼요.
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <Queue />
      </Suspense>
    </>
  );
}

async function Queue() {
  const { supabase } = await requireAdminPage();
  const photos = await getPendingPhotos(supabase);
  const urls = await getAdminPhotoUrls(
    supabase,
    photos.map((p) => ({ photo: p, visible: !p.report.is_hidden && !p.report.deleted_at })),
  );
  const items: QueueItem[] = photos.map((p) => ({
    photoId: p.id,
    reportId: p.report.id,
    reportNo: p.report.report_no,
    address: p.report.road_address ?? p.report.address,
    fullUrl: urls[p.id]?.full ?? "",
    thumbUrl: urls[p.id]?.thumb ?? "",
    status: p.moderation_status,
    sido: p.report.sido,
    sigungu: p.report.sigungu,
    isHidden: p.report.is_hidden,
  }));
  return <PhotoReviewQueue initialItems={items} />;
}
