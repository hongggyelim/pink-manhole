"use client";

import { routes } from "@/shared/routes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { reportNoSchema } from "@/shared/schemas";

export default function LookupPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const no = value.trim().toUpperCase();
    if (!reportNoSchema.safeParse(no).success) {
      setError("조회번호 형식을 확인해주세요. (예: PM-261103-7K3Q)");
      return;
    }
    router.push(routes.reportDetail(no));
  }

  return (
    <main>
      <PageHeader title="조회번호로 찾기" />
      <form onSubmit={submit} className="px-5 pt-4">
        <label htmlFor="report-no" className="text-sm font-medium">조회번호</label>
        <input
          id="report-no"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          placeholder="PM-261103-7K3Q"
          autoCapitalize="characters"
          className="mt-2 h-12 w-full rounded-xl border px-4 text-base uppercase outline-none focus:border-primary"
        />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <button className="mt-6 h-14 w-full rounded-full bg-primary text-lg font-bold text-white">조회하기</button>
      </form>
    </main>
  );
}
