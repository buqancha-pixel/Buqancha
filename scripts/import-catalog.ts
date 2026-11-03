/**
 * Katalog importi: sotuvchi sitemap'idagi kitob sahifalaridan kitoblar bazasini to'ldirish.
 *   npm run import-catalog -- <sotuvchi-slug> [--limit N]
 * Uzoq davom etadi (har sahifa orasida pauza); to'xtatib, keyin davom ettirish mumkin.
 */
import { importCatalog } from "../lib/collector/catalog";
import { prisma } from "../lib/db";

async function main() {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith("--"));
  const li = args.indexOf("--limit");
  const limit = li >= 0 ? Number(args[li + 1]) : undefined;
  if (!slug) {
    console.error("Foydalanish: npm run import-catalog -- <sotuvchi-slug> [--limit N]");
    process.exit(2);
  }
  const started = Date.now();
  const r = await importCatalog(slug, {
    limit,
    onBatch: (done, total, s) => {
      const min = ((Date.now() - started) / 60000).toFixed(1);
      console.log(
        `[${slug}] ${done}/${total} (${min} daq): yangi kitob ${s.newBooks}, yangi nashr ${s.newEditions}, ` +
          `taklif ${s.created}, yangilandi ${s.updated}, moslanmadi ${s.unmatched}, xato ${s.errors.length}`,
      );
    },
  });
  console.log(`[${slug}] ${r.status}${r.error ? `: ${r.error}` : ""}`);
  process.exitCode = r.status === "FAILED" ? 1 : 0;
}

main().finally(() => prisma.$disconnect());
