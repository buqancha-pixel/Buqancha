/**
 * Hamkor feed'ini import qilish (CSV yoki JSON).
 *   npm run import-feed -- <sotuvchi-slug> <fayl.csv|fayl.json>
 *
 * CSV ustunlari: isbn, nom (title), muallif (author), nashriyot (publisher),
 * narx (price), mavjud (in_stock), havola (url), sku. Majburiy: nom, narx.
 * Feed butun katalog hisoblanadi: unda yo'q takliflar "mavjud emas" bo'ladi.
 */
import { readFileSync } from "node:fs";
import { importFeed } from "../lib/collector/run";
import { prisma } from "../lib/db";
import { printResult } from "./collect";

async function main() {
  const [slug, file] = process.argv.slice(2);
  if (!slug || !file) {
    console.error("Foydalanish: npm run import-feed -- <sotuvchi-slug> <fayl.csv|fayl.json>");
    process.exit(2);
  }
  const fmt = file.endsWith(".json") ? "json" : file.endsWith(".csv") ? "csv" : undefined;
  const result = await importFeed(slug, readFileSync(file, "utf8"), fmt);
  printResult(result);
  process.exitCode = result.status === "FAILED" ? 1 : 0;
}

main().finally(() => prisma.$disconnect());
