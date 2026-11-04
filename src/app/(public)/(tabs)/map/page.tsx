import { Suspense } from "react";
import { pageMetadata } from "@/shared/seo";
import { Route } from "@/shared/routes";
import { MapExplorer } from "@/features/reports/map-explorer";
import { getMapPoints } from "@/server/services/reports";

export const metadata = pageMetadata({ title: "지도", path: Route.Map, description: "전국 분홍 맨홀 제보 위치를 지도에서 확인하세요." });

export default function MapPage() {
  return (
    <Suspense fallback={<div className="h-[calc(100dvh-4rem)] bg-[#eef1f4]" />}>
      <MapData />
    </Suspense>
  );
}

async function MapData() {
  const points = await getMapPoints();
  return <MapExplorer points={points} />;
}
