import { Suspense } from "react";
import { REPORT_STATUSES, type ReportStatus } from "@/shared/constants";
import { getStats } from "@/server/services/reports";

export const metadata = { title: "통계" };

export default function StatsPage() {
  return (
    <main className="px-4 pb-8">
      <h1 className="flex h-14 items-center text-lg font-bold">제보 현황</h1>
      <Suspense fallback={<p className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</p>}>
        <Stats />
      </Suspense>
    </main>
  );
}

async function Stats() {
  const { total, bySido, byStatus } = await getStats();
  const max = Math.max(1, ...bySido.map(([, n]) => n));
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-pink-soft p-5">
        <p className="text-sm text-muted-foreground">전체 제보</p>
        <p className="mt-1 text-3xl font-extrabold text-primary">{total.toLocaleString()}건</p>
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
