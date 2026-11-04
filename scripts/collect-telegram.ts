/**
 * Sotuvchining ochiq Telegram kanalidan narxlar.
 *   npm run collect-telegram -- <sotuvchi-slug> <kanal>     (masalan: asaxiy asaxiybooks)
 */
import { importTelegram } from "../lib/collector/run";
import { printResult } from "./collect";
import { prisma } from "../lib/db";

async function main() {
  const [slug, channel] = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  if (!slug || !channel) {
    console.error("Foydalanish: npm run collect-telegram -- <sotuvchi-slug> <kanal>");
    process.exitCode = 2;
    return;
  }
  if (!(await prisma.seller.findUnique({ where: { slug } }))) {
    console.log(`${slug}: bazada yo'q (o'chirilgan) — o'tkazildi`);
    return;
  }
  const r = await importTelegram(slug, channel.replace(/^@/, "").replace(/^https?:\/\/t\.me\/(s\/)?/, ""));
  printResult(r);
  process.exitCode = r.status === "FAILED" ? 1 : 0;
}

main().finally(() => prisma.$disconnect());
