/**
 * Narxlarni yig'ish.
 *   npm run collect                  — yig'ish yoqilgan barcha sotuvchilar
 *   npm run collect -- asaxiy topar  — faqat ko'rsatilganlar
 */
import { collectAll, collectSeller, type RunResult } from "../lib/collector/run";
import { prisma } from "../lib/db";

async function main() {
  const slugs = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const results: RunResult[] = slugs.length
    ? await Promise.all(slugs.map((s) => collectSeller(s)))
    : await collectAll();
  for (const r of results) printResult(r);
  if (!results.length) console.log("Yig'ish yoqilgan sotuvchi yo'q (Seller.collector = NONE).");
  process.exitCode = results.some((r) => r.status === "FAILED") ? 1 : 0;
}

export function printResult(r: RunResult) {
  const s = r.stats;
  console.log(
    `${r.seller} [${r.kind}] ${r.status}: ko'rildi ${s.seen}, yangi ${s.created}, yangilandi ${s.updated}, ` +
      `o'zgarmadi ${s.unchanged}, moslanmadi ${s.unmatched}, shubhali ${s.flagged}, rad ${s.rejected}, ` +
      `mavjud emas ${s.markedOut}`,
  );
  if (r.error) console.log(`  xato: ${r.error}`);
  for (const e of s.errors.slice(0, 20)) console.log(`  - ${e}`);
  if (s.errors.length > 20) console.log(`  … yana ${s.errors.length - 20} ta`);
}

if (process.argv[1]?.endsWith("collect.ts")) {
  main().finally(() => prisma.$disconnect());
}
