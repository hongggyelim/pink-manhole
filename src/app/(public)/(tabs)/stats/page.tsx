import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { WeeklyChart } from "@/features/reports/weekly-chart";
import { REPORT_STATUSES, type ReportStatus } from "@/shared/constants";
import { getStats } from "@/server/services/reports";
import { Route } from "@/shared/routes";

export const metadata = { title: "통계" };

export default function StatsPage() {
  return (
    <main className="px-4 pb-8">
      <h1 className="flex h-14 items-center text-lg font-bold">제보 현황</h1>
      <Link href={Route.About} className="mb-5 flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm">
        <span className="flex-1 leading-snug break-keep text-muted-foreground">
          모인 제보는 지역별로 정리해 지자체에 개선을 요청하는 데 사용돼요.
        </span>
        <span className="flex shrink-0 items-center font-semibold whitespace-nowrap">
          왜 만들었나요? <ChevronRight className="size-4" />
        </span>
      </Link>
      <Suspense fallback={<p className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</p>}>
        <Stats />
      </Suspense>
    </main>
  );
}

async function Stats() {
  const { total, thisWeek, lastWeek, districtCount, submitted, weekly, bySido, byStatus } = await getStats();
  const delta = thisWeek - lastWeek;
  const max = Math.max(1, ...bySido.map(([, n]) => n));
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-pink-soft p-5">
        <p className="text-sm text-muted-foreground">전체 제보</p>
        <p className="mt-1 text-5xl font-extrabold">
          {total.toLocaleString()}
          <span className="ml-1 text-xl font-bold">건</span>
        </p>
      </section>

      <section aria-label="주요 지표" className="grid grid-cols-3 gap-2">
        <StatTile
          label="이번 주 신규"
          value={`${thisWeek.toLocaleString()}건`}
          note={delta === 0 ? "지난주와 같아요" : `지난주보다 ${delta > 0 ? "+" : ""}${delta}건`}
        />
        <StatTile label="제보 지역" value={`${districtCount.toLocaleString()}곳`} note="시·군·구 기준" />
        <StatTile label="민원 접수" value={`${submitted.toLocaleString()}건`} note="지자체 전달 완료" />
      </section>

      <section>
        <h2 className="font-bold">주별 제보 추이</h2>
        <p className="mt-0.5 mb-4 text-xs text-muted-foreground">최근 8주 · 월요일 시작 기준</p>
        <WeeklyChart data={weekly} />
      </section>

      <section>
        <h2 className="mb-3 font-bold">처리 상태</h2>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(REPORT_STATUSES) as ReportStatus[]).map((s) => (
            <div key={s} className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">{REPORT_STATUSES[s]}</p>
              <p className="mt-1 text-lg font-bold">{(byStatus[s] ?? 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold">지역별 제보</h2>
        {bySido.length === 0 && <p className="text-sm text-muted-foreground">아직 제보가 없어요.</p>}
        <ul className="space-y-2.5">
          {bySido.map(([name, n]) => (
            <li key={name} className="flex items-center gap-3 text-sm">
              <span className="w-10 shrink-0 font-medium">{name}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} />
              </div>
              <span className="w-12 shrink-0 text-right tabular-nums">{n.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight break-keep text-muted-foreground">{note}</p>
    </div>
  );
}
