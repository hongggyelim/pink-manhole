// Renders static images from the SVG sources in this folder.
// Usage: node scripts/og/generate.mjs
//   default.svg       → public/og/default.png            (1200×630 share image: Open Graph / KakaoTalk)
//   landing-scene.svg → public/images/landing-scene.png  (main-screen illustration, transparent, 3×)
// Text is rendered with the system's Korean font (macOS: Apple SD Gothic Neo).
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const jobs = [
  { src: "./default.svg", out: "../../public/og/default.png", width: 1200, height: 630 },
  { src: "./landing-scene.svg", out: "../../public/images/landing-scene.png", width: 1080, height: 990 },
];

for (const { src, out, width, height } of jobs) {
  const input = fileURLToPath(new URL(src, import.meta.url));
  const output = fileURLToPath(new URL(out, import.meta.url));
  mkdirSync(dirname(output), { recursive: true });
  // density scales the vector before rasterising, so the 3× export stays sharp
  const density = Math.ceil((72 * width) / (src.includes("landing") ? 360 : 1200));
  const info = await sharp(input, { density }).resize(width, height).png({ compressionLevel: 9 }).toFile(output);
  console.log(`wrote ${out.replace("../../", "")} (${info.width}×${info.height}, ${(info.size / 1024).toFixed(0)}KB)`);
}
