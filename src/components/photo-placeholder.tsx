import { cn } from "@/lib/utils";

const COVER = {
  /** 검토 전: the service's pink manhole. */
  pending: { rim: "#c94473", face: "#e8578a", line: "#f6a6c3", label: "검토 전 사진" },
  /** 비공개: a plain black manhole. */
  private: { rim: "#0b0b0d", face: "#1f1f23", line: "#3a3a40", label: "비공개 사진" },
} as const;

export type PlaceholderKind = keyof typeof COVER;

/**
 * Stands in for a photo the public may not see. Nothing derived from the original is
 * published: the main screen's background with a drawn manhole cover on top.
 */
export function PhotoPlaceholder({ kind, className }: { kind: PlaceholderKind; className?: string }) {
  const c = COVER[kind];
  const bars = [-24, -12, 0, 12, 24];
  return (
    <div
      role="img"
      aria-label={c.label}
      className={cn(
        "flex size-full items-center justify-center bg-gradient-to-b from-[#3a3a3f] via-[#4a4648] to-[#2b2a2e]",
        className,
      )}
    >
      <svg viewBox="0 0 100 100" className="size-[62%] drop-shadow-[0_3px_4px_rgba(0,0,0,.45)]" aria-hidden="true">
        <defs>
          <clipPath id={`mh-${kind}`}>
            <circle cx="50" cy="50" r="34" />
          </clipPath>
        </defs>
        <circle cx="50" cy="50" r="44" fill={c.rim} />
        <circle cx="50" cy="50" r="38" fill={c.face} />
        <circle cx="50" cy="50" r="34" fill="none" stroke={c.line} strokeWidth="2" />
        <g clipPath={`url(#mh-${kind})`} stroke={c.line} strokeWidth="2.4" strokeLinecap="round">
          {bars.map((d) => (
            <line key={`h${d}`} x1="10" x2="90" y1={50 + d} y2={50 + d} />
          ))}
          {bars.map((d) => (
            <line key={`v${d}`} y1="10" y2="90" x1={50 + d} x2={50 + d} />
          ))}
        </g>
        <circle cx="50" cy="50" r="7" fill={c.rim} stroke={c.line} strokeWidth="2" />
      </svg>
    </div>
  );
}
