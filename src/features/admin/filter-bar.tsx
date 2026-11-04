"use client";

import { Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { REPORT_STATUSES, SIDO_LIST } from "@/shared/constants";
import { Route, withQuery } from "@/shared/routes";

type Filters = { view: string; q?: string; sido?: string; status?: string };

/**
 * Applies filters through the Next router: selects apply immediately, search on Enter/button.
 * The URL stays the single source of truth (the server reads it; export reuses it).
 */
export function FilterBar({ filters }: { filters: Filters }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(filters.q ?? "");

  function apply(patch: Partial<Filters>) {
    const next = { ...filters, q: q.trim() || undefined, ...patch };
    const p = new URLSearchParams();
    if (next.view && next.view !== "all") p.set("view", next.view);
    if (next.q) p.set("q", next.q);
    if (next.sido) p.set("sido", next.sido);
    if (next.status) p.set("status", next.status);
    start(() => router.push(withQuery(Route.Admin, Object.fromEntries(p)), { scroll: false })); // page resets to 1
  }

  const active = Boolean(filters.q || filters.sido || filters.status);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply({});
      }}
      className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center"
    >
      <div className="relative col-span-2 sm:min-w-56 sm:flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="주소·조회번호·시군구·메모 검색"
          enterKeyHint="search"
          className="h-10 w-full rounded-lg border bg-white pr-3 pl-9 text-base outline-none focus:border-primary sm:text-sm"
        />
      </div>
      <select
        aria-label="지역"
        value={filters.sido ?? ""}
        onChange={(e) => apply({ sido: e.target.value || undefined })}
        className="h-10 rounded-lg border bg-white px-2 text-sm"
      >
        <option value="">전체 지역</option>
        {SIDO_LIST.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
      </select>
      <select
        aria-label="처리 상태"
        value={filters.status ?? ""}
        onChange={(e) => apply({ status: e.target.value || undefined })}
        className="h-10 rounded-lg border bg-white px-2 text-sm"
      >
        <option value="">전체 상태</option>
        {Object.entries(REPORT_STATUSES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
      </select>
      <button className="col-span-2 flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white sm:col-span-1">
        {pending && <Loader2 className="size-4 animate-spin" />} 검색
      </button>
      {active && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            apply({ q: undefined, sido: undefined, status: undefined });
          }}
          className="col-span-2 flex items-center justify-center gap-1 text-sm text-muted-foreground underline sm:col-span-1"
        >
          <X className="size-3.5" /> 초기화
        </button>
      )}
    </form>
  );
}
