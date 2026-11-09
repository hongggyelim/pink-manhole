import { LandingScene } from "@/components/layout/landing-scene";
import { Route } from "@/shared/routes";
import { Camera, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    // Exactly one screen tall: the illustration absorbs whatever height is left.
    // Short screens (≤700px, e.g. iPhone SE) get tighter spacing and buttons.
    <main className="relative flex h-dvh flex-col overflow-hidden bg-gradient-to-b from-[#3a3a3f] via-[#4a4648] to-[#2b2a2e] px-6 pt-[max(3.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] text-white [@media(max-height:700px)]:pt-[max(2rem,env(safe-area-inset-top))] [@media(max-height:700px)]:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <h1 className="shrink-0 break-keep text-[32px] leading-tight font-extrabold [@media(max-height:700px)]:text-[28px]">
        전국의{" "}
        <MapPin className="inline size-9 -translate-y-1 fill-primary text-primary [&>circle]:fill-[#3a3a3f] [&>circle]:stroke-[#3a3a3f]" />
        <span className="text-primary">분홍 맨홀</span>을 찾아주세요
      </h1>
      <p className="mt-4 shrink-0 break-keep text-[17px] leading-relaxed text-white/85 [@media(max-height:700px)]:mt-2 [@media(max-height:700px)]:text-[15px]">
        당신의 제보가 더 안전한 일상을 만듭니다.
      </p>

      {/* Takes the remaining height; the SVG scales to fit (preserveAspectRatio: meet). */}
      <div className="relative my-3 min-h-0 flex-1">
        <LandingScene className="absolute inset-0 size-full" />
      </div>

      <div className="flex shrink-0 flex-col gap-3 [@media(max-height:700px)]:gap-2">
        <Link
          href={Route.Report}
          className="flex h-14 items-center justify-center gap-2 rounded-lg bg-primary text-lg font-bold shadow-lg shadow-primary/30 [@media(max-height:700px)]:h-12"
        >
          <Camera className="size-5" /> 신고하기
        </Link>
        <Link
          href={Route.Map}
          className="flex h-14 items-center justify-center rounded-lg border-2 border-white/90 text-lg font-bold [@media(max-height:700px)]:h-12"
        >
          지도에서 보기
        </Link>
        <Link
          href={Route.About}
          className="mt-3 flex items-center justify-center gap-1 text-sm text-white/80 [@media(max-height:700px)]:mt-1"
        >
          분홍 맨홀에 대해 알아보기 <ChevronRight className="size-4" />
        </Link>
      </div>
    </main>
  );
}
