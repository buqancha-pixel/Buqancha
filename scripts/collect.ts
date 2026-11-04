/**
 * Narxlarni yig'ish.
 *   npm run collect                  — yig'ish yoqilgan barcha sotuvchilar
 *   npm run collect -- asaxiy topar  — faqat ko'rsatilganlar
 *   npm run collect -- qamar --stale=24 — faqat 24 soatdan beri tekshirilmaganlar
 */
import { collectAll, collectSeller, type RunResult } from "../lib/collector/run";
import { prisma } from "../lib/db";

async function main() {
  const args = process.argv.slice(2);
  const slugs = args.filter((a) => !a.startsWith("-"));
  const stale = Number(args.find((a) => a.startsWith("--stale="))?.split("=")[1]);
  const opts = Number.isFinite(stale) && stale > 0 ? { staleHours: stale } : {};
  // admin panelda o'chirilgan sotuvchilar o'tkazib yuboriladi (workflow ro'yxatida qolgan bo'lsa ham)
  const existing = new Set((await prisma.seller.findMany({ where: { slug: { in: slugs } }, select: { slug: true } })).map((s) => s.slug));
  for (const s of slugs.filter((x) => !existing.has(x))) console.log(`${s}: bazada yo'q (o'chirilgan) — o'tkazildi`);
  const results: RunResult[] = slugs.length
    ? await Promise.all(slugs.filter((s) => existing.has(s)).map((s) => collectSeller(s, opts)))
    : await collectAll(opts);
  for (const r of results) printResult(r);
  if (!results.length) console.log("Yig'ish yoqilgan sotuvchi yo'q (Seller.collector = NONE).");
  process.exitCode = results.some((r) => r.status === "FAILED") ? 1 : 0;
}

export function printResult(r: RunResult) {
  const s = r.stats;
  console.log(
    `${r.seller} [${r.kind}] ${r.status}: ko'rildi ${s.seen}, yangi ${s.created}, yangilandi ${s.updated}, ` +
      `o'zgarmadi ${s.unchanged}, moslanmadi ${s.unmatched}, shubhali ${s.flagged}, rad ${s.rejected}, ` +
      `mavjud emas ${s.markedOut}, yangi nashr ${s.newEditions}`,
  );
  if (r.error) console.log(`  xato: ${r.error}`);
  for (const e of s.errors.slice(0, 20)) console.log(`  - ${e}`);
  if (s.errors.length > 20) console.log(`  … yana ${s.errors.length - 20} ta`);
}

if (process.argv[1]?.endsWith("collect.ts")) {
  main().finally(() => prisma.$disconnect());
}
