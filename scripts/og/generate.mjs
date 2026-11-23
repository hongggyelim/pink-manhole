// Renders the share image from the SVG source in src/components/layout/art/scene-art.ts.
// Usage: node --experimental-strip-types scripts/og/generate.mjs
//   ogImageSvg(cover) → public/og/default.png            (1200×630 share image: Open Graph / KakaoTalk)
//   favicon.ico, icon.png, apple-icon.png → src/app       (favicons from the same cover photo)
// Text is rendered with the system's Korean font (macOS: Apple SD Gothic Neo).
// After changing the share image, bump OG_IMAGE_VERSION in src/shared/seo.ts.
import sharp from "sharp";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

// Favicons from the same manhole cover photo (Next.js file conventions in src/app).
//   favicon.ico     16/32/48, transparent (PNG-compressed ICO entries)
//   icon.png        512×512, transparent (modern browsers, Android)
//   apple-icon.png  180×180, cover on the asphalt background of the share image (iOS fills transparency with black)
const app = (name) => fileURLToPath(new URL(`../../src/app/${name}`, import.meta.url));
const coverAt = (size) => sharp(cover).resize(size, size, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toBuffer();

const icoSizes = [16, 32, 48];
const icoImages = await Promise.all(icoSizes.map(coverAt));
const header = Buffer.alloc(6 + 16 * icoImages.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoImages.length, 4);
let offset = header.length;
icoImages.forEach((png, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(icoSizes[i], e);
  header.writeUInt8(icoSizes[i], e + 1);
  header.writeUInt16LE(1, e + 4); // colour planes
  header.writeUInt16LE(32, e + 6); // bits per pixel
  header.writeUInt32LE(png.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
writeFileSync(app("favicon.ico"), Buffer.concat([header, ...icoImages]));
console.log(`wrote src/app/favicon.ico (${icoSizes.join("/")})`);

await sharp(await coverAt(512)).toFile(app("icon.png"));
console.log("wrote src/app/icon.png (512×512)");

const appleCover = await coverAt(150);
await sharp({ create: { width: 180, height: 180, channels: 4, background: "#3a3a3f" } })
  .composite([{ input: appleCover, gravity: "center" }])
  .png({ compressionLevel: 9 })
  .toFile(app("apple-icon.png"));
console.log("wrote src/app/apple-icon.png (180×180)");
