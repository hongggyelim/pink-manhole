import { Camera, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { PinkManhole } from "@/components/layout/pink-manhole";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-[#3a3a3f] via-[#4a4648] to-[#2b2a2e] px-6 pt-20 pb-10 text-white">
      <h1 className="text-[34px] leading-tight font-extrabold">
        전국의{" "}
        <MapPin className="inline size-9 -translate-y-1 fill-primary text-primary [&>circle]:fill-[#3a3a3f] [&>circle]:stroke-[#3a3a3f]" />
        <br />
        <span className="text-primary">분홍맨홀</span>을
        <br />
        찾아주세요
      </h1>
      <p className="mt-5 text-[17px] leading-relaxed text-white/85">
        당신의 제보가
        <br />더 안전한 일상을 만듭니다.
      </p>

      <div className="flex flex-1 items-center justify-center py-8">
        <PinkManhole className="w-[115%] max-w-none -rotate-12 drop-shadow-2xl [transform:rotateX(55deg)_rotate(-12deg)]" />
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/report"
          className="flex h-14 items-center justify-center gap-2 rounded-full bg-primary text-lg font-bold shadow-lg shadow-primary/30"
        >
          <Camera className="size-5" /> 신고하기
        </Link>
        <Link
          href="/home"
          className="flex h-14 items-center justify-center rounded-full border-2 border-white/90 text-lg font-bold"
        >
          지도에서 보기
        </Link>
        <Link href="/about" className="mt-3 flex items-center justify-center gap-1 text-sm text-white/80">
          분홍맨홀에 대해 알아보기 <ChevronRight className="size-4" />
        </Link>
      </div>
    </main>
  );
}
