/**
 * Sotuvchilarning ochiq Telegram kanallaridan narxlar.
 *   npm run collect-telegram                         — quyidagi barcha kanallar
 *   npm run collect-telegram -- <sotuvchi-slug> <kanal>   (masalan: asaxiy asaxiybooks)
 */
import { importTelegram } from "../lib/collector/run";
import { printResult } from "./collect";
import { prisma } from "../lib/db";

/** sotuvchi slug'i → kanal (sotuvchi o'zi narx e'lon qiladigan rasmiy kanal) */
export const TELEGRAM_SOURCES: Array<[string, string]> = [
  ["asaxiy", "asaxiybooks"],
  ["book-uz", "bookuzbekistan"],
  ["zabarjad-media", "ZabarjadMedia"],
  ["ibook", "iBook_uz"],
];

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const pairs: Array<[string, string]> = args.length >= 2 ? [[args[0], args[1]]] : TELEGRAM_SOURCES;
  let failed = false;
  for (const [slug, raw] of pairs) {
    if (!(await prisma.seller.findUnique({ where: { slug } }))) {
      console.log(`${slug}: bazada yo'q (o'chirilgan yoki hali sinxronlanmagan) — o'tkazildi`);
      continue;
    }
    try {
      const r = await importTelegram(slug, raw.replace(/^@/, "").replace(/^https?:\/\/t\.me\/(s\/)?/, ""));
      printResult(r);
      if (r.status === "FAILED") failed = true;
    } catch (e) {
      console.log(`${slug}: xato — ${(e as Error).message}`);
      failed = true;
    }
  }
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => prisma.$disconnect());
