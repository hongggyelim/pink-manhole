// Renders the favicons from the photo placeholder tile (public/images/photo-placeholder.webp),
// the pink manhole tile shown in place of photos under review or private.
// Usage: node scripts/favicon/generate.mjs
//   src/app/favicon.ico     16/32/48, transparent corners (PNG-compressed ICO entries)
//   src/app/icon.png        288×288 (the source's own size, not upscaled), transparent corners
//   src/app/apple-icon.png  180×180, edges cropped so the tile fills the square (iOS rounds the corners itself
//                           and fills transparency with black)
// Next.js picks these up by file convention, no metadata code needed.
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../../public/images/photo-placeholder.webp", import.meta.url)));
const app = (name) => fileURLToPath(new URL(`../../src/app/${name}`, import.meta.url));
const tileAt = (size) => sharp(source).resize(size, size, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toBuffer();

const icoSizes = [16, 32, 48];
const icoImages = await Promise.all(icoSizes.map(tileAt));
const header = Buffer.alloc(6 + 16 * icoImages.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2); // type: icon
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

const { width } = await sharp(source).metadata();
await sharp(source).png({ compressionLevel: 9 }).toFile(app("icon.png"));
console.log(`wrote src/app/icon.png (${width}×${width})`);

// Drop the rounded corners and drop shadow: crop inside the tile's border.
const inset = 10;
await sharp(source)
  .extract({ left: inset, top: inset, width: width - inset * 2, height: width - inset * 2 })
  .resize(180, 180, { kernel: "lanczos3" })
  .flatten({ background: "#e8adb1" })
  .png({ compressionLevel: 9 })
  .toFile(app("apple-icon.png"));
console.log("wrote src/app/apple-icon.png (180×180)");
