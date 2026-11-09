import { cn } from "@/lib/utils";
import { landingSceneSvg } from "./art/scene-art";

/** Built once at module load: static, trusted markup (no user input). */
const SVG = landingSceneSvg();

/**
 * Landing hero: a pink manhole image with "맨홀을 발견하셨나요? / 절대 밟지 마세요!" below.
 * The markup lives in `art/scene-art.ts`; the image is public/images/landing-manhole.png.
 */
export function LandingScene({ className }: { className?: string }) {
  return (
    <div
      className={cn("[&>svg]:size-full", className)}
      dangerouslySetInnerHTML={{ __html: SVG }}
    />
  );
}
