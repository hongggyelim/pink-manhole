/**
 * Single source for the static illustrations, as SVG strings:
 *  - landingSceneSvg(): main-screen hero (manhole image + warning text), rendered inline by <LandingScene>
 *  - ogImageSvg(): 1200×630 share card (public/og/default.png) with the round manhole cover photo
 *    (scripts/og/manhole-cover.png, transparent), which the generator passes in as a data URI.
 * Regenerate the share PNG with `node --experimental-strip-types scripts/og/generate.mjs`.
 *
 * Plain TS with no imports or TS-only runtime syntax, so Node can load it with type stripping.
 */

const KOREAN_FONT =
  "Pretendard Variable, Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif";

const f = (n: number) => Number(n.toFixed(2));

/* ── Landing scene ─────────────────────────────────────────────────────── */

const W = 360;
/** Pink manhole render (public/images/landing-manhole.png, 1230×1278), full width at its own ratio. */
const PHOTO = { src: "/images/landing-manhole.png", width: W, height: f((W * 1278) / 1230) };
const H = f(PHOTO.height + 80);

/** Main-screen hero: the manhole image with the warning text below it. Rendered inline by <LandingScene>. */
export function landingSceneSvg() {
  const { src, width, height } = PHOTO;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="분홍색 맨홀 위에 위치 핀이 떠 있는 그림. 아래에 '맨홀을 발견하셨나요? 절대 밟지 마세요!'라고 적혀 있다.">
  <image href="${src}" width="${width}" height="${height}"/>

  <g text-anchor="middle" font-family="${KOREAN_FONT}" font-size="20" font-weight="800" fill="#fff" letter-spacing="-0.3">
    <text x="${W / 2}" y="${f(height + 38)}">맨홀을 발견하셨나요?</text>
    <text x="${W / 2}" y="${f(height + 68)}"><tspan fill="#ff7aa8">절대</tspan> 밟지 마세요!</text>
  </g>
</svg>`;
}

/* ── Open Graph card ───────────────────────────────────────────────────── */

/** Cover photo centred at (330, 315), 456px across. */
const OG_COVER = { cx: 330, cy: 315, r: 228 };

export function ogImageSvg(coverHref: string) {
  const { cx, cy, r } = OG_COVER;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <filter id="og-shadow" x="-20%" y="-20%" width="140%" height="145%">
      <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000" flood-opacity=".4"/>
    </filter>
    <linearGradient id="og-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a3a3f"/>
      <stop offset="55%" stop-color="#4a4648"/>
      <stop offset="100%" stop-color="#2b2a2e"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#og-bg)"/>
  <image href="${coverHref}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" filter="url(#og-shadow)"/>
  <g font-family="${KOREAN_FONT}" font-weight="800" fill="#fff">
    <text x="652" y="296" font-size="78">분홍색 맨홀을</text>
    <text x="652" y="396" font-size="78">발견하셨나요<tspan fill="#e8578a">?</tspan></text>
  </g>
</svg>`;
}
