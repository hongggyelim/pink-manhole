import { cn } from "@/lib/utils";
import { landingSceneSvg } from "./art/scene-art";

/** Built once at module load: static, trusted markup (no user input). */
const SVG = landingSceneSvg();

/**
 * Landing illustration: a pink manhole in the middle of a path seen from above, with
 * footprints walking around it and "분홍색 맨홀은 절대 밟지 마세요" below. The markup lives in
 * `art/scene-art.ts` (shared with the PNG export); the walking animation (.ls-step) is in
 * globals.css and respects prefers-reduced-motion.
 */
export function LandingScene({ className }: { className?: string }) {
  return <div className={cn("[&>svg]:size-full", className)} dangerouslySetInnerHTML={{ __html: SVG }} />;
}
