import { Bug, Megaphone, TriangleAlert, Wrench } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { PinkManhole } from "@/components/layout/pink-manhole";

export const metadata = { title: "분홍맨홀에 대해 알아보기" };

const RISKS = [
  { icon: TriangleAlert, title: "안전사고 위험", desc: "보행자, 차량의 사고를 유발할 수 있어요." },
  { icon: Wrench, title: "시설물 관리 문제", desc: "정확한 관리 주체가 불분명할 수 있어요." },
  { icon: Bug, title: "환경 및 위생 문제", desc: "누수, 악취 등으로 주변 환경에 영향을 줄 수 있어요." },
];

export default function AboutPage() {
  return (
    <main className="pb-10">
      <PageHeader title="분홍맨홀에 대해 알아보기" />
      <div className="flex h-48 items-center justify-center overflow-hidden bg-[repeating-linear-gradient(45deg,#9a9a9f_0_18px,#a7a7ac_18px_36px)]">
        <PinkManhole className="w-64 [transform:rotateX(50deg)]" />
      </div>
      <section className="px-5 pt-6">
        <h2 className="text-xl font-bold">분홍맨홀, 왜 위험할까요?</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          분홍맨홀은 일반적인 맨홀과 달리 설치 목적이 불분명하거나, 안전 기준에 맞지 않는 경우가 많아 여러 가지
          위험을 초래할 수 있습니다.
        </p>
        <ul className="mt-6 space-y-5">
          {RISKS.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="flex gap-3">
              <Icon className="mt-0.5 size-6 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex gap-3 rounded-2xl bg-pink-soft p-5">
          <Megaphone className="size-7 shrink-0 text-primary" />
          <div>
            <p className="font-bold">이 앱의 목적은?</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              분홍맨홀을 발견하고, 시민들의 제보를 모아 행정기관의 답변과 조치를 이끌어내는 것입니다.
            </p>
          </div>
        </div>
        <Link
          href="/report/photo"
          className="mt-8 flex h-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-white"
        >
          분홍맨홀 제보하기
        </Link>
      </section>
    </main>
  );
}
