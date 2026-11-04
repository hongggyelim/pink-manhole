"use client";

import { ChevronUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Route } from "@/shared/routes";

/** Pages where the button never shows (the map is a fixed, non-scrolling view). */
const EXCLUDED = [Route.Map];
/** Show once the top header (56px) plus some content has scrolled out of view. */
const SHOW_AFTER_PX = 240;
const TAB_PAGES = [Route.Home, Route.Stats, Route.More];

/**
 * Floating "back to top" button. Fades/slides in after scrolling down and sits above
 * whatever is fixed at the bottom of the current page (tab bar, report submit bar).
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const excluded = EXCLUDED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (excluded) return;
    // Plain scroll handler: setState bails out when the boolean is unchanged, so this is
    // cheap, and unlike requestAnimationFrame it never stalls in throttled frames/iframes.
    const update = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [excluded, pathname]);

  if (excluded) return null;

  const isAdmin = pathname.startsWith(Route.Admin);
  const bottom = TAB_PAGES.some((p) => pathname.startsWith(p))
    ? "bottom-[calc(5rem+env(safe-area-inset-bottom))]" // above the 4rem tab bar
    : pathname === Route.Report
      ? "bottom-[calc(7.5rem+env(safe-area-inset-bottom))]" // above the sticky submit bar
      : "bottom-[calc(1.25rem+env(safe-area-inset-bottom))]";

  function toTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className={cn("pointer-events-none fixed inset-x-0 z-40", bottom)}>
      <div className={cn("mx-auto flex justify-end px-4", isAdmin ? "max-w-6xl" : "max-w-[480px]")}>
        <button
          type="button"
          onClick={toTop}
          aria-label="맨 위로"
          tabIndex={visible ? 0 : -1}
          aria-hidden={!visible}
          className={cn(
            "flex size-11 items-center justify-center rounded-full border bg-white/95 text-navy shadow-lg backdrop-blur",
            "transition-all duration-300 ease-out motion-reduce:transition-none",
            "hover:bg-pink-soft hover:text-primary active:scale-95",
            visible ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-90 opacity-0",
          )}
        >
          <ChevronUp className="size-6" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
