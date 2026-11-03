import { Suspense } from "react";
import { MapExplorer } from "@/features/reports/map-explorer";
import { getMapPoints } from "@/server/services/reports";

export const metadata = { title: "지도" };

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
