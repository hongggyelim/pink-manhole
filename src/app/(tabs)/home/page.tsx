import { ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/layout/logo";
import { HomeMap } from "@/features/reports/home-map";
import { getMapPoints } from "@/server/services/reports";

export const metadata = { title: "홈" };

export default function HomePage() {
  return (
    <main className="flex h-[calc(100dvh-4rem)] flex-col">
      <header className="flex h-14 items-center justify-between px-4">
        <Logo />
        <Link href="/more" aria-label="메뉴" className="p-1">
          <Menu className="size-6" />
        </Link>
      </header>
      <Suspense fallback={<Banner count={null} />}>
        <BannerData />
      </Suspense>
      <Suspense fallback={<div className="flex-1 bg-[#eef1f4]" />}>
        <MapData />
      </Suspense>
    </main>
  );
}

async function BannerData() {
  const points = await getMapPoints();
  return <Banner count={points.length} />;
}

function Banner({ count }: { count: number | null }) {
  return (
    <Link href="/stats" className="mx-4 mb-3 flex items-center justify-between rounded-2xl bg-pink-soft px-5 py-4">
      <p className="text-[17px] leading-snug font-bold">
        지금까지
        <br />
        <span className="text-primary">{count === null ? "…" : count.toLocaleString()}개</span>의 분홍맨홀이
        <br />
        제보되었어요!
      </p>
      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-white">
        <ChevronRight className="size-4" />
      </span>
    </Link>
  );
}

async function MapData() {
  const points = await getMapPoints();
  return <HomeMap points={points} />;
}
