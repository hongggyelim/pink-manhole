/**
 * Single source for the static illustrations, as SVG strings:
 *  - landingSceneSvg(): main-screen illustration (rendered inline by <LandingScene>, exported to
 *    public/images/landing-scene.png)
 *  - ogImageSvg(): 1200×630 share card (public/og/default.png)
 * Regenerate the PNGs with `node --experimental-strip-types scripts/og/generate.mjs`.
 *
 * Plain TS with no imports or TS-only runtime syntax, so Node can load it with type stripping.
 * The cover is the round part of the about page's first manhole (pink terrazzo, ring, vent
 * slots) without the hole or cracks.
 */

const KOREAN_FONT = "Pretendard Variable, Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif";

/** Terrazzo chips, same tile as the about-page covers (34×34 in cover units). */
const TERRAZZO_CHIPS: [number, number, number, string, number][] = [
  [11.0, 5.1, 0.45, "#ffffff", 0.55], [12.4, 2.0, 1.05, "#7c5357", 0.55], [2.9, 14.2, 0.55, "#ffffff", 1],
  [2.0, 19.2, 0.55, "#ffffff", 1], [1.7, 7.5, 1.05, "#fbe6e8", 0.85], [14.3, 18.4, 1.05, "#a06a70", 0.7],
  [3.5, 19.4, 0.55, "#c98289", 0.55], [18.6, 2.1, 0.45, "#7c5357", 1], [23.1, 14.5, 0.7, "#3e2a2c", 1],
  [12.3, 8.4, 0.55, "#7c5357", 0.55], [19.5, 17.9, 0.7, "#3e2a2c", 0.85], [20.7, 2.5, 1.05, "#5d3f42", 0.7],
  [25.7, 5.2, 0.85, "#5d3f42", 0.55], [32.7, 2.6, 1.05, "#c98289", 0.85], [23.6, 20.2, 1.05, "#3e2a2c", 0.55],
  [28.6, 32.1, 0.85, "#ffffff", 0.55], [24.9, 10.5, 1.05, "#3e2a2c", 0.85], [24.4, 30.2, 0.7, "#ffffff", 1],
  [12.1, 20.8, 0.85, "#ffffff", 0.7], [26.1, 4.4, 0.55, "#5d3f42", 1], [31.2, 16.9, 0.55, "#3e2a2c", 1],
  [18.7, 30.0, 0.85, "#d9a0a6", 0.85], [24.0, 33.5, 0.85, "#7c5357", 0.7], [2.8, 5.1, 0.55, "#ffffff", 1],
  [28.3, 6.2, 0.7, "#ffffff", 0.7], [14.2, 12.6, 1.05, "#c98289", 0.7],
];

const f = (n: number) => Number(n.toFixed(2));

/** <defs> for one cover (ids prefixed so several SVGs can live on one page). */
function coverDefs(p: string) {
  const chips = TERRAZZO_CHIPS.map(
    ([x, y, r, c, o]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${o}"/>`,
  ).join("");
  const slots = Array.from(
    { length: 8 },
    (_, i) => `<rect x="-1.6" y="-31" width="3.2" height="7" rx="1.6" transform="rotate(${22 + i * 45})"/>`,
  ).join("");
  return `
    <pattern id="${p}-terrazzo" width="34" height="34" patternUnits="userSpaceOnUse">
      <rect width="34" height="34" fill="#eba9b0"/>${chips}
    </pattern>
    <radialGradient id="${p}-shade" cx="42%" cy="38%" r="70%">
      <stop offset="0%" stop-color="#fff" stop-opacity=".18"/>
      <stop offset="60%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#5a3a3d" stop-opacity=".22"/>
    </radialGradient>
    <filter id="${p}-shadow" x="-20%" y="-20%" width="140%" height="145%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="2.6" flood-color="#000" flood-opacity=".4"/>
    </filter>
    <g id="${p}-slots">${slots}</g>`;
}

/** Round pink terrazzo cover centred at (cx, cy) with outer radius r. Drawn at r=48 and scaled. */
function cover(p: string, cx: number, cy: number, r: number) {
  const s = f(r / 48);
  return `
  <g transform="translate(${cx} ${cy}) scale(${s})">
    <circle r="48" fill="#8f5a60" filter="url(#${p}-shadow)"/>
    <circle r="46" fill="url(#${p}-terrazzo)"/>
    <circle r="46" fill="url(#${p}-shade)"/>
    <circle r="45.3" fill="none" stroke="#c4868d" stroke-width="1.4"/>
    <circle r="39" fill="none" stroke="#a9666e" stroke-width="2.4"/>
    <circle r="40.6" fill="none" stroke="#f7d3d7" stroke-width=".8" opacity=".8"/>
    <use href="#${p}-slots" fill="#2b1c1f"/>
  </g>`;
}

/* ── Landing scene ─────────────────────────────────────────────────────── */

const W = 360;
const H = 360;
const MH = { x: 180, y: 148, r: 64 };

/** One right-shoe sole pointing up (toe at −y), centred on its middle; mirrored for the left foot. */
const SOLE =
  '<path d="M0.6 -12.5 C5 -12.5 6.6 -7 6.2 -2 C5.9 2 4 4 0.8 4 C-2.6 4 -4.8 2.2 -4.9 -1.8 C-5 -7.4 -3.6 -12.5 0.6 -12.5 Z"/>' +
  '<path d="M0.4 6.2 C3.3 6.2 4.3 8.4 4.1 10.4 C3.9 12.4 2.4 13.4 0.3 13.4 C-1.9 13.4 -3.4 12.3 -3.5 10.3 C-3.6 8.2 -2.4 6.2 0.4 6.2 Z"/>';

type Step = { x: number; y: number; angle: number; foot: -1 | 1; delay: number };

/**
 * Two trails that walk around the cover: the left one heading down, the right one heading up.
 * Each trail swings out around the manhole and the warning text, so the prints visibly avoid it.
 */
function trail(side: -1 | 1): Step[] {
  const baseX = MH.x + side * 104;
  const bulge = (y: number) => side * 30 * Math.exp(-(((y - 190) / 110) ** 2));
  const stride = 30;
  const steps: Step[] = [];
  const offset = side === 1 ? stride / 2 : 0;
  for (let i = 0, y = -14 + offset; y < H + 14; i++, y += stride) {
    const foot: -1 | 1 = i % 2 === 0 ? -1 : 1; // alternate left/right foot
    const slope = (bulge(y + 1) - bulge(y - 1)) / 2; // dx/dy of the trail
    // heading: down (180°) on the left trail, up (0°) on the right; tilt along the curve
    const angle = side === -1 ? 180 - (Math.atan(slope) * 180) / Math.PI : (Math.atan(-slope) * 180) / Math.PI;
    // feet sit either side of the walking line (relative to the walking direction)
    const lateral = foot * 6.5 * (side === -1 ? -1 : 1);
    steps.push({ x: baseX + bulge(y) + lateral, y, angle: angle + foot * 5, foot, delay: 0 });
  }
  // walking order: down the left trail (top → bottom), up the right one (bottom → top)
  const ordered = side === -1 ? steps : [...steps].reverse();
  ordered.forEach((s, i) => (s.delay = i * 0.42));
  return steps;
}

/** Animated (per-print fade, classes in globals.css) on the page; static and fully visible in the PNG. */
export function landingSceneSvg() {
  const prints = [...trail(-1), ...trail(1)]
    .map(
      (s) =>
        `<g class="ls-step" style="animation-delay:${f(s.delay)}s" transform="translate(${f(s.x)} ${f(s.y)}) rotate(${f(s.angle)}) scale(${s.foot} 1)">${SOLE}</g>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="위에서 내려다본 길 한가운데에 분홍색 맨홀이 있고, 양쪽 발자국이 맨홀을 피해 지나가는 그림. 맨홀 아래에 '분홍색 맨홀은 절대 밟지 마세요'라고 적혀 있다.">
  <defs>
    ${coverDefs("ls")}
    <pattern id="ls-pavers" width="30" height="30" patternUnits="userSpaceOnUse">
      <rect width="30" height="30" fill="#55525a"/>
      <path d="M0 .5 H30 M.5 0 V30" stroke="#000" stroke-opacity=".18" stroke-width="1"/>
      <path d="M0 1.5 H30 M1.5 0 V30" stroke="#fff" stroke-opacity=".04" stroke-width="1"/>
    </pattern>
    <linearGradient id="ls-fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".14" stop-color="#fff" stop-opacity="1"/>
      <stop offset=".86" stop-color="#fff" stop-opacity="1"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="ls-fade-mask"><rect width="${W}" height="${H}" fill="url(#ls-fade)"/></mask>
  </defs>

  <g mask="url(#ls-fade-mask)">
    <rect x="18" y="0" width="${W - 36}" height="${H}" fill="url(#ls-pavers)"/>
    <rect x="12" y="0" width="6" height="${H}" fill="#6c6870"/>
    <rect x="${W - 18}" y="0" width="6" height="${H}" fill="#6c6870"/>
    <g fill="#fff" fill-opacity=".42">${prints}</g>
  </g>

  ${cover("ls", MH.x, MH.y, MH.r)}

  <text x="${MH.x}" y="${MH.y + MH.r + 44}" text-anchor="middle" font-family="${KOREAN_FONT}" font-size="18" font-weight="800" fill="#fff" letter-spacing="-0.3">분홍색 맨홀은 <tspan fill="#ff7aa8">절대</tspan> 밟지 마세요</text>
</svg>`;
}

/* ── Open Graph card ───────────────────────────────────────────────────── */

export function ogImageSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    ${coverDefs("og")}
    <linearGradient id="og-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a3a3f"/>
      <stop offset="55%" stop-color="#4a4648"/>
      <stop offset="100%" stop-color="#2b2a2e"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#og-bg)"/>
  ${cover("og", 330, 315, 228)}
  <g font-family="${KOREAN_FONT}" font-weight="800" fill="#fff">
    <text x="652" y="296" font-size="78">분홍색 맨홀을</text>
    <text x="652" y="396" font-size="78">발견하셨나요<tspan fill="#e8578a">?</tspan></text>
  </g>
</svg>`;
}
