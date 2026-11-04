/**
 * Sotuvchidagi mahsulot sahifasini kuzatuvga qo'shish (JSON-LD orqali).
 *   npm run track-url -- <sotuvchi-slug> <mahsulot-havolasi>
 * Keyin `npm run collect` bu sahifani muntazam qayta tekshiradi
 * (sotuvchida collector = PRODUCT_PAGE bo'lishi kerak).
 */
import { trackProductUrl } from "../lib/collector/run";
import { prisma } from "../lib/db";
import { printResult } from "./collect";

async function main() {
  const [slug, url] = process.argv.slice(2);
  if (!slug || !url) {
    console.error("Foydalanish: npm run track-url -- <sotuvchi-slug> <havola>");
    process.exit(2);
  }
  const result = await trackProductUrl(slug, url);
  printResult(result);
  process.exitCode = result.status === "FAILED" ? 1 : 0;
}

main().finally(() => prisma.$disconnect());
