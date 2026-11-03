"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function PageHeader({ title, backHref, right }: { title: string; backHref?: string; right?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-1 bg-white/95 px-2 backdrop-blur">
      <button
        aria-label="뒤로 가기"
        className="rounded-full p-2 hover:bg-muted"
        onClick={() => (backHref ? router.push(backHref) : router.back())}
      >
        <ChevronLeft className="size-6" />
      </button>
      <h1 className="flex-1 text-lg font-bold">{title}</h1>
      {right}
    </header>
  );
}
