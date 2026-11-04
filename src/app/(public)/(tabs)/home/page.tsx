import { ChevronRight, Menu } from "lucide-react";
import { pageMetadata } from "@/shared/seo";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { ReportListItem } from "@/features/reports/report-list-item";
import { SubmittedToast } from "@/features/reports/submitted-toast";
import { getRecentReports, getTotalCount } from "@/server/services/reports";
import { SIDO_LIST } from "@/shared/constants";
import { Route, withQuery } from "@/shared/routes";

export const metadata = pageMetadata({ title: "홈", path: Route.Home, description: "지역별로 모인 분홍 맨홀 제보를 확인하고, 발견한 맨홀을 제보해주세요." });

type SP = PageProps<"/home">["searchParams"];

export default function HomePage({ searchParams }: PageProps<"/home">) {
  return (
    <main className="flex flex-col">
      <Suspense>
        <SubmittedToast />
      </Suspense>
      <header className="flex h-14 items-center justify-between px-4">
        <Logo />
        <Link href={Route.More} aria-label="메뉴" className="p-1">
          <Menu className="size-6" />
        </Link>
      </header>
      <Suspense fallback={<Banner count={null} />}>
        <BannerData />
      </Suspense>
      <Suspense fallback={<RegionChips current={null} />}>
        <Chips searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<p className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</p>}>
        <ReportList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function readSido(searchParams: SP) {
  const { sido } = await searchParams;
  return typeof sido === "string" && SIDO_LIST.some((s) => s.name === sido) ? sido : null;
}

async function BannerData() {
  return <Banner count={await getTotalCount()} />;
}

function Banner({ count }: { count: number | null }) {
  return (
    <Link href={Route.Stats} className="mx-4 mb-2 flex items-center justify-between rounded-2xl bg-pink-soft px-5 py-4">
      <p className="text-[17px] leading-snug font-bold">
        지금까지
        <br />
        <span className="text-primary">{count === null ? "…" : count.toLocaleString()}개</span>의 분홍 맨홀이
        <br />
        제보되었어요!
      </p>
      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-white">
        <ChevronRight className="size-4" />
      </span>
    </Link>
  );
}

async function Chips({ searchParams }: { searchParams: SP }) {
  return <RegionChips current={await readSido(searchParams)} />;
}

function RegionChips({ current }: { current: string | null }) {
  return (
    <nav aria-label="지역 필터" className="no-scrollbar sticky top-0 z-10 flex gap-2 overflow-x-auto bg-white px-4 py-3">
      {[null, ...SIDO_LIST.map((s) => s.name)].map((name) => (
        <Link
          key={name ?? "all"}
          href={withQuery(Route.Home, { sido: name })}
          scroll={false}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
            current === name ? "border-primary bg-primary text-white" : "bg-white text-muted-foreground",
          )}
        >
          {name ?? "전국"}
        </Link>
      ))}
    </nav>
  );
}

async function ReportList({ searchParams }: { searchParams: SP }) {
  const sido = await readSido(searchParams);
  const reports = await getRecentReports({ sido: sido ?? undefined, limit: 100 });
  if (reports.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">{sido ? `${sido} 지역에 ` : ""}아직 제보가 없어요.</p>
        <Link href={Route.Report} className="mt-4 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white">
          첫 제보하기
        </Link>
      </div>
    );
  }
  return (
    <section className="px-4">
      <p className="pb-1 text-xs text-muted-foreground">최근 제보 {reports.length}건</p>
      <div className="divide-y">
        {reports.map((r) => <ReportListItem key={r.id} report={r} />)}
      </div>
    </section>
  );
}
