/**
 * PWA ikonlarını kaynaktan (public/icons/icon.svg) üretir.
 * Çalıştırma: npm run icons
 *
 * Üretilen dosyalar Git'e commit'lenir; Netlify build sırasında sharp
 * çalıştırmaz. Logoyu değiştirdiğinizde script'i yeniden çalıştırın.
 */
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";
const outDir = join(root, "public/icons");
mkdirSync(outDir, { recursive: true });

const kaynakSvg = readFileSync(join(outDir, "icon.svg"));

const hedefler = [
  { ad: "icon-192.png", boyut: 192 },
  { ad: "icon-512.png", boyut: 512 },
  { ad: "apple-touch-icon-180.png", boyut: 180 },
  { ad: "apple-touch-icon-167.png", boyut: 167 },
  { ad: "apple-touch-icon-152.png", boyut: 152 },
  { ad: "apple-touch-icon-120.png", boyut: 120 },
];

for (const { ad, boyut } of hedefler) {
  await sharp(kaynakSvg, { density: Math.max(72, boyut * 2) })
    .resize(boyut, boyut)
    .png()
    .toFile(join(outDir, ad));
  console.log(`✓ ${ad} (${boyut}×${boyut})`);
}
