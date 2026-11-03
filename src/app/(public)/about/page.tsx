import { Ban, Camera, Car, ShieldAlert, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { PinkManhole } from "@/components/layout/pink-manhole";

export const metadata = { title: "분홍맨홀에 대해 알아보기" };

const RISKS = [
  {
    icon: ShieldAlert,
    title: "내구성 저하 및 부식",
    desc: "시멘트·콘크리트로 만들어져 시간이 지나면서 강도가 크게 떨어졌습니다. 특히 하수구나 폐수에서 나오는 황화수소 등 유해 가스가 내부 콘크리트와 철근을 빠르게 부식시킵니다.",
  },
  {
    icon: TriangleAlert,
    title: "겉보기와 다른 내부 손상",
    desc: "겉으로는 멀쩡해 보여도 내부가 텅 비어 있거나 부서져 있어, 보행자가 밟는 순간 맨홀이 무너져 아래로 추락하는 사고가 발생하고 있습니다.",
  },
  {
    icon: Car,
    title: "차량·킥보드 충격에 취약",
    desc: "스쿠터, 자전거, 전동 킥보드가 지나갈 때 가해지는 하중을 견디지 못하고 파손될 위험이 큽니다.",
  },
];

const ACTIONS = [
  {
    icon: Ban,
    title: "밟지 않기",
    desc: "길을 걷다가 분홍색 콘크리트 맨홀을 발견하면 최대한 밟지 않고 피해서 걸어야 합니다.",
  },
  {
    icon: Camera,
    title: "신고하기",
    desc: "균열이 있거나 흔들리는 등 파손이 의심되는 분홍색 맨홀을 발견했다면, 즉시 사진을 찍어 안전신문고 앱 등을 통해 지자체에 교체를 요청하거나 신고해야 합니다.",
  },
];

function ItemList({ items }: { items: typeof RISKS }) {
  return (
    <ul className="mt-4 space-y-5">
      {items.map(({ icon: Icon, title, desc }) => (
        <li key={title} className="flex gap-3">
          <Icon className="mt-0.5 size-6 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">{title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AboutPage() {
  return (
    <main className="pb-10">
      <PageHeader title="분홍맨홀에 대해 알아보기" />
      <div className="flex h-48 items-center justify-center overflow-hidden bg-[repeating-linear-gradient(45deg,#9a9a9f_0_18px,#a7a7ac_18px_36px)]">
        <PinkManhole className="w-64 [transform:rotateX(50deg)]" />
      </div>
      <section className="px-5 pt-6">
        <h2 className="text-xl font-bold">분홍색 맨홀이 위험한 이유</h2>
        <ItemList items={RISKS} />
      </section>
      <section className="mx-5 mt-8 rounded-2xl bg-pink-soft p-5">
        <h2 className="text-lg font-bold">대처 및 행동 요령</h2>
        <ItemList items={ACTIONS} />
      </section>
      <div className="px-5">
        <Link
          href="/report/photo"
          className="mt-8 flex h-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-white"
        >
          분홍맨홀 제보하기
        </Link>
      </div>
    </main>
  );
}
