"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminNavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/admin" ? pathname === "/admin" || pathname.startsWith("/admin/reports") : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
        active ? "bg-pink-soft text-primary" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}
