/**
 * Single source for the static illustrations, as SVG strings:
 *  - landingSceneSvg(): main-screen hero (manhole photo + warning text), rendered inline by <LandingScene>
 *  - ogImageSvg(): 1200×630 share card (public/og/default.png)
 * Regenerate the share PNG with `node --experimental-strip-types scripts/og/generate.mjs`.
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
/** Square photo of a real pink manhole (public/images/landing-manhole.jpg, 720×720). */
const PHOTO = { src: "/images/landing-manhole.jpg", x: 70, y: 8, size: 220, radius: 18 };

/** Main-screen hero: the manhole photo with the warning text below it. Rendered inline by <LandingScene>. */
export function landingSceneSvg() {
  const { src, x, y, size, radius } = PHOTO;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="길에 설치된 분홍색 맨홀 사진. 아래에 '맨홀을 발견하셨나요? 절대 밟지 마세요!'라고 적혀 있다.">
  <defs>
    <clipPath id="ls-photo-clip"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}"/></clipPath>
    <filter id="ls-shadow" x="-20%" y="-20%" width="140%" height="145%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity=".4"/>
    </filter>
  </defs>

  <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="#8f5a60" filter="url(#ls-shadow)"/>
  <image href="${src}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#ls-photo-clip)"/>

  <g text-anchor="middle" font-family="${KOREAN_FONT}" font-size="18" font-weight="800" fill="#fff" letter-spacing="-0.3">
    <text x="${W / 2}" y="256">맨홀을 발견하셨나요?</text>
    <text x="${W / 2}" y="282"><tspan fill="#ff7aa8">절대</tspan> 밟지 마세요!</text>
  </g>
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
