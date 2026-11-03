/** Decorative pink manhole cover illustration (no photo assets needed). */
export function PinkManhole({ className }: { className?: string }) {
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <radialGradient id="pm-g" cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#f7a8c4" />
          <stop offset="100%" stopColor="#d9467b" />
        </radialGradient>
        <pattern id="pm-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="none" />
          <circle cx="5" cy="5" r="1.6" fill="#c2386b" opacity=".55" />
        </pattern>
      </defs>
      <circle cx="100" cy="100" r="96" fill="#b8325f" />
      <circle cx="100" cy="100" r="90" fill="url(#pm-g)" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="#c2386b" strokeWidth="3" opacity=".6" />
      {ticks.map((deg) => (
        <rect key={deg} x="98" y="14" width="4" height="8" rx="1" fill="#c2386b" opacity=".5"
          transform={`rotate(${deg} 100 100)`} />
      ))}
      <circle cx="100" cy="100" r="66" fill="url(#pm-grid)" />
      <circle cx="100" cy="100" r="22" fill="#f4a0bf" stroke="#c2386b" strokeWidth="3" opacity=".9" />
    </svg>
  );
}
