import { Ban, Camera, Car, ExternalLink, Newspaper, ShieldAlert, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { DamagedManholes } from "@/components/layout/damaged-manholes";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "분홍 맨홀에 대해 알아보기" };

const RISKS = [
  {
    icon: ShieldAlert,
    title: "내구성 저하 및 부식",
    desc: "시멘트·콘크리트로 만들어진 맨홀은 시간이 지나면서 강도가 떨어질 수 있습니다. 특히 하수구나 폐수에서 발생하는 황화수소 등의 가스는 내부 콘크리트와 철근을 부식시킬 수 있습니다.",
  },
  {
    icon: TriangleAlert,
    title: "겉보기와 다른 내부 손상",
    desc: "겉으로는 멀쩡해 보여도 내부가 비어 있거나 손상되어 있을 수 있습니다. 보행자가 밟는 순간 맨홀이 무너져 추락하는 사고로 이어질 위험이 있습니다.",
  },
  {
    icon: Car,
    title: "차량·킥보드 충격에 취약",
    desc: "스쿠터, 자전거, 전동 킥보드 등이 지나갈 때 발생하는 하중과 충격으로 맨홀이 파손될 위험이 있습니다.",
  },
];

const ACTIONS = [
  {
    icon: Ban,
    title: "밟지 않기",
    desc: "길을 걷다가 분홍색 콘크리트 맨홀을 발견하면 최대한 밟지 않고 피해 주세요.",
  },
  {
    icon: Camera,
    title: "신고하기",
    desc: "균열이 있거나 흔들리는 등 파손이 의심되는 맨홀을 발견했다면 사진과 위치를 기록하고 안전신문고 등을 통해 지자체에 신고해 주세요.",
  },
];

const ARTICLE = {
  outlet: "연합뉴스TV",
  date: "2025.06.19",
  title: "싸고 예쁘지만 사고 위험 ‘조화 맨홀’…“장마철 더 조심”",
  url: "https://www.yonhapnewstv.co.kr/news/MYH20250619224638305",
};

const DAMAGE_LABELS = ["깨짐", "부식", "함몰"];

function ItemList({ items }: { items: typeof RISKS }) {
  return (
    <ul className="mt-4 space-y-5">
      {items.map(({ icon: Icon, title, desc }) => (
        <li key={title} className="flex gap-3">
          <Icon className="mt-0.5 size-6 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">{title}</p>
            <p className="mt-0.5 text-sm leading-relaxed break-keep text-muted-foreground">{desc}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AboutPage() {
  return (
    <main className="pb-10">
      <PageHeader title="분홍 맨홀에 대해 알아보기" />

      <figure className="bg-[#9c9ca2] px-3 pt-4 pb-3">
        <DamagedManholes className="h-auto w-full" />
        <figcaption className="mt-2 grid grid-cols-3 text-center text-xs font-semibold text-white">
          {DAMAGE_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </figcaption>
      </figure>

      <section className="px-5 pt-6">
        <h2 className="text-xl font-bold">분홍색 맨홀이 위험한 이유</h2>
        <ItemList items={RISKS} />
      </section>

      <section className="mx-5 mt-8 rounded-2xl bg-pink-soft p-5">
        <h2 className="text-lg font-bold">대처 및 행동 요령</h2>
        <ItemList items={ACTIONS} />
      </section>

      <section className="px-5 pt-8">
        <h2 className="text-lg font-bold">관련 기사</h2>
        <a
          href={ARTICLE.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-start gap-3 rounded-2xl border p-4 transition hover:bg-muted"
        >
          <Newspaper className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="leading-snug font-semibold break-keep">{ARTICLE.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {ARTICLE.outlet} · {ARTICLE.date}
            </p>
          </div>
          <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="새 창에서 열기" />
        </a>
      </section>

      <section className="px-5 pt-8">
        <h2 className="text-lg font-bold">이 서비스를 만든 이유</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed break-keep text-muted-foreground">
          <p>
            분홍색 맨홀의 위험성을 알리고, 전국 곳곳에 흩어져 있는 맨홀의 위치와 상태를 한곳에 모으기 위해 이
            서비스를 만들었습니다.
          </p>
          <p>
            저는 관련 기관이나 단체가 아닌 평범한 개인입니다. 직접 문제를 해결할 수는 없지만, 시민들이 발견한 위험
            정보를 함께 기록하고 공유한다면 문제를 더 명확하게 알리고 개선을 요청하는 데 도움이 될 수 있다고
            생각했습니다.
          </p>
          <p>
            이 서비스는 개별적으로 흩어져 있던 제보를 모아 지역별 위험 현황을 파악하고, 축적된 데이터를 바탕으로
            지자체에 일괄적으로 개선을 요청하는 것을 목표로 합니다.
          </p>
          <p className="font-semibold text-foreground">
            여러분의 작은 제보가 안전한 거리와 실질적인 개선으로 이어질 수 있도록 함께해 주세요.
          </p>
        </div>
      </section>

      <div className="px-5">
        <Link
          href="/report"
          className="mt-8 flex h-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-white"
        >
          분홍 맨홀 제보하기
        </Link>
      </div>
    </main>
  );
}
