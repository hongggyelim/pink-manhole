// Renders the share image from the SVG source in src/components/layout/art/scene-art.ts.
// Usage: node --experimental-strip-types scripts/og/generate.mjs
//   ogImageSvg(cover) → public/og/default.png            (1200×630 share image: Open Graph / KakaoTalk)
// Text is rendered with the system's Korean font (macOS: Apple SD Gothic Neo).
// After changing the share image, bump OG_IMAGE_VERSION in src/shared/seo.ts.
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ogImageSvg } from "../../src/components/layout/art/scene-art.ts";

// Round manhole cover photo with a transparent background, cut out of the source image.
const cover = readFileSync(fileURLToPath(new URL("./manhole-cover.png", import.meta.url)));
const coverHref = `data:image/png;base64,${cover.toString("base64")}`;

const jobs = [
  { svg: ogImageSvg(coverHref), viewWidth: 1200, out: "../../public/og/default.png", width: 1200, height: 630 },
];

for (const { svg, viewWidth, out, width, height } of jobs) {
  const output = fileURLToPath(new URL(out, import.meta.url));
  mkdirSync(dirname(output), { recursive: true });
  // density scales the vector before rasterising, so the 3× export stays sharp
  const density = Math.ceil((72 * width) / viewWidth);
  const info = await sharp(Buffer.from(svg), { density }).resize(width, height).png({ compressionLevel: 9 }).toFile(output);
  console.log(`wrote ${out.replace("../../", "")} (${info.width}×${info.height}, ${(info.size / 1024).toFixed(0)}KB)`);
}
