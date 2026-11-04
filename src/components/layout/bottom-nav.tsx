"use client";

import { BarChart3, Camera, Ellipsis, House, Map } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Route } from "@/shared/routes";

const TABS = [
  { href: Route.Home, label: "홈", icon: House },
  { href: Route.Map, label: "지도", icon: Map },
  { href: Route.Report, label: "신고하기", icon: Camera, primary: true },
  { href: Route.Stats, label: "통계", icon: BarChart3 },
  { href: Route.More, label: "더보기", icon: Ellipsis },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="grid h-16 grid-cols-5">
        {TABS.map(({ href, label, icon: Icon, primary }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex items-center justify-center">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {primary ? (
                  <span className="-mt-7 mb-0.5 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 ring-4 ring-white">
                    <Icon className="size-6" />
                  </span>
                ) : (
                  <Icon className="size-5" />
                )}
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
