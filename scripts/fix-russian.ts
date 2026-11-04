/**
 * Avtomatik import qilingan ruscha kitoblarni belgilash: nomi asl kirill holida, nashrlari "Rus tilida".
 * (Avval ruscha nomlar o'zbek lotiniga o'girilib, o'zbekcha nashr sifatida saqlangan edi.)
 *   npm run fix-russian            — ro'yxat
 *   npm run fix-russian -- --apply — qo'llash
 * Qo'lda kiritilgan kitoblarga va asosan lotincha (aralash) nomlarga tegilmaydi.
 */
import { prisma } from "../lib/db";
import { buildSearchKey } from "../lib/normalize";
import { looksRussian } from "../lib/translit";

const APPLY = process.argv.includes("--apply");

/** Harflarning qancha qismi kirill ("Сила Instagram. Простой путь..." — ko'pi kirill). */
function cyrillicShare(t: string): number {
  const letters = t.match(/\p{L}/gu) ?? [];
  if (!letters.length) return 0;
  return letters.filter((c) => /[\u0400-\u04FF]/.test(c)).length / letters.length;
}

async function main() {
  const books = await prisma.book.findMany({ where: { origin: "import" }, include: { author: true, editions: true } });
  let n = 0;
  for (const b of books) {
    const ru = [b.titleCyrl, b.title].find((t) => t && looksRussian(t) && cyrillicShare(t) >= 0.7);
    if (!ru) continue;
    const needsTitle = b.title !== ru;
    const eds = b.editions.filter((e) => !e.language);
    if (!needsTitle && !eds.length) continue;
    n++;
    console.log(`  ${b.title}${needsTitle ? `  →  ${ru}` : ""}  (${eds.length} nashr → ru)`);
    if (!APPLY) continue;
    await prisma.book.update({
      where: { id: b.id },
      data: { title: ru, titleCyrl: null, searchKey: buildSearchKey(ru, b.title !== ru ? b.title : null, b.author.name, b.author.nameCyrl) },
    });
    if (eds.length) await prisma.edition.updateMany({ where: { id: { in: eds.map((e) => e.id) } }, data: { language: "ru" } });
  }
  console.log(`\n${n} ta kitob ${APPLY ? "belgilandi" : "belgilanadi (--apply bilan qo'llang)"}.`);
}

main().finally(() => prisma.$disconnect());
