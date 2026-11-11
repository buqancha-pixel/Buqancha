/**
 * Kitobni boshqa kitobga nashr sifatida qo'shish.
 *   npm run merge-book -- <kitob-slug> <asosiy-kitob-slug> [--til=en] [--apply]
 * --apply bo'lmasa faqat nima bo'lishini ko'rsatadi. --til: ko'chirilgan nashrlarning tili (en, ru, uz-Cyrl...).
 */
import { prisma } from "../lib/db";
import { mergeBookInto } from "../lib/admin/books";
import { LANGUAGE_LABEL } from "../lib/format";

async function main() {
  const args = process.argv.slice(2);
  const [fromSlug, intoSlug] = args.filter((a) => !a.startsWith("--"));
  const til = args.find((a) => a.startsWith("--til="))?.split("=")[1];
  if (!fromSlug || !intoSlug) {
    console.error("Foydalanish: npm run merge-book -- <kitob-slug> <asosiy-kitob-slug> [--til=en] [--apply]");
    process.exitCode = 2;
    return;
  }
  if (til && !LANGUAGE_LABEL[til]) throw new Error(`Noma'lum til: ${til} (${Object.keys(LANGUAGE_LABEL).join(", ")})`);
  const [from, into] = await Promise.all([
    prisma.book.findUnique({ where: { slug: fromSlug }, include: { author: true, editions: { include: { _count: { select: { offers: true } } } } } }),
    prisma.book.findUnique({ where: { slug: intoSlug }, include: { author: true, editions: true } }),
  ]);
  if (!from) throw new Error(`Kitob topilmadi: ${fromSlug}`);
  if (!into) throw new Error(`Kitob topilmadi: ${intoSlug}`);
  console.log(`"${from.title}" (${from.author.name}) → "${into.title}" (${into.author.name})`);
  for (const e of from.editions)
    console.log(`  nashr: ${e.publisher}, ISBN ${e.isbn ?? "—"}, ${e._count.offers} narx${til ? ` → ${LANGUAGE_LABEL[til]}` : ""}`);
  console.log(`  "${into.title}"da hozir ${into.editions.length} nashr bor`);
  if (!args.includes("--apply")) {
    console.log("\n(--apply bilan qo'llang)");
    return;
  }
  await mergeBookInto(from.id, into.id, til);
  console.log(`\nBajarildi: /kitob/${into.slug}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
