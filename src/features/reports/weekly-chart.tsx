"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type WeeklyPoint = { start: string; label: string; count: number; current: boolean };

/**
 * Round the axis max up to a clean 1/2/5×10ⁿ value whose half is also a whole number,
 * so all three gridlines (0, mid, max) are integer counts. Minimum 4.
 */
function niceMax(n: number) {
  if (n <= 4) return 4;
  for (let mag = 10 ** Math.floor(Math.log10(n)); ; mag *= 10) {
    for (const m of [1, 2, 5, 10]) {
      const v = m * mag;
      if (v >= n && Number.isInteger(v / 2)) return v;
    }
  }
}

const PLOT_H = 140;

/**
 * Single-series column chart (weekly report counts). One hue (brand pink, validated
 * against the surface); "이번 주" is marked by its axis label + direct value label,
 * never by color alone. Every bar is a focusable hit target with a tooltip, and the
 * same data is available as a screen-reader table.
 */
export function WeeklyChart({ data }: { data: WeeklyPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.count)));
  const ticks = [max, max / 2, 0];
  const empty = data.every((d) => d.count === 0);

  return (
    <figure>
      <div className="flex gap-2">
        {/* y-axis ticks */}
        <div className="relative w-6 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums" style={{ height: PLOT_H }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>
              {t.toLocaleString()}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {/* plot */}
          <div className="relative" style={{ height: PLOT_H }} onPointerLeave={() => setActive(null)}>
            {ticks.map((t) => (
              <div key={t} aria-hidden className="absolute inset-x-0 h-px bg-border" style={{ top: `${(1 - t / max) * 100}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end">
              {data.map((d, i) => {
                const h = (d.count / max) * PLOT_H;
                return (
                  <button
                    key={d.start}
                    type="button"
                    aria-label={`${d.current ? "이번 주" : `${d.label} 주`}: ${d.count}건`}
                    onPointerEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className="group relative flex h-full flex-1 items-end justify-center outline-none"
                  >
                    {/* direct label: current week only (selective labeling) */}
                    {d.current && d.count > 0 && (
                      <span className="absolute text-xs font-semibold tabular-nums" style={{ bottom: h + 4 }}>
                        {d.count}
                      </span>
                    )}
                    <span
                      className={cn(
                        "block w-[min(24px,60%)] rounded-t-[4px] bg-primary transition-opacity",
                        active !== null && active !== i && "opacity-60",
                        "group-focus-visible:ring-2 group-focus-visible:ring-primary/40 group-focus-visible:ring-offset-2",
                      )}
                      style={{ height: Math.max(h, d.count > 0 ? 2 : 0) }}
                    />
                    {active === i && (
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute z-10 rounded-lg bg-navy px-2.5 py-1.5 text-left whitespace-nowrap text-white shadow-lg"
                        style={{ bottom: h + (d.current ? 24 : 8) }}
                      >
                        <span className="block text-sm font-bold tabular-nums">{d.count.toLocaleString()}건</span>
                        <span className="block text-[11px] text-white/70">{d.current ? "이번 주" : `${d.label} 주`}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {empty && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                최근 8주 동안 접수된 제보가 없어요.
              </p>
            )}
          </div>

          {/* x-axis */}
          <div aria-hidden className="mt-1.5 flex text-[11px] text-muted-foreground">
            {data.map((d) => (
              <span key={d.start} className={cn("flex-1 text-center tabular-nums", d.current && "font-bold text-foreground")}>
                {d.current ? "이번 주" : d.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>주별 제보 수 (최근 8주, 월요일 시작)</caption>
        <thead>
          <tr><th scope="col">주 시작일</th><th scope="col">제보 수</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.start}><td>{d.current ? `이번 주 (${d.start})` : d.start}</td><td>{d.count}건</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
