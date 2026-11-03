/**
 * Takror mualliflar va kitoblarni birlashtirish (katalog importidan keyin).
 *   npm run merge-duplicates            — o'zgartirishlarni ko'rsatadi (hech narsa o'zgarmaydi)
 *   npm run merge-duplicates -- --apply — birlashtiradi
 * Muallif: normallashtirilgan ism bir xil. Kitob: normallashtirilgan nom va muallif bir xil.
 * Eng eski yozuv saqlanadi; nashrlar (va ularning narxlari) unga o'tkaziladi.
 */
import { prisma } from "../lib/db";
import { buildSearchKey, searchKey } from "../lib/normalize";

const APPLY = process.argv.includes("--apply");

function groups<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    m.set(k, [...(m.get(k) ?? []), r]);
  }
  return Array.from(m.values()).filter((g) => g.length > 1);
}

async function main() {
  // 1) mualliflar
  const authors = await prisma.author.findMany({ orderBy: { id: "asc" }, include: { _count: { select: { books: true } } } });
  let mergedAuthors = 0;
  for (const g of groups(authors, (a) => searchKey(a.name))) {
    const [keep, ...dups] = g.sort((a, b) => b._count.books - a._count.books);
    console.log(`muallif: ${keep.name}  ⟵  ${dups.map((d) => d.name).join(", ")}`);
    if (APPLY) {
      await prisma.book.updateMany({ where: { authorId: { in: dups.map((d) => d.id) } }, data: { authorId: keep.id } });
      await prisma.author.deleteMany({ where: { id: { in: dups.map((d) => d.id) } } });
      if (!keep.nameCyrl) {
        const cyrl = dups.find((d) => d.nameCyrl)?.nameCyrl;
        if (cyrl) await prisma.author.update({ where: { id: keep.id }, data: { nameCyrl: cyrl, searchKey: buildSearchKey(keep.name, cyrl) } });
      }
    }
    mergedAuthors += dups.length;
  }

  // 2) kitoblar
  const books = await prisma.book.findMany({ orderBy: { createdAt: "asc" }, include: { author: true } });
  let mergedBooks = 0;
  for (const g of groups(books, (b) => `${searchKey(b.title)}|${b.authorId}`)) {
    const [keep, ...dups] = g; // eng eskisi (seed kitoblari va ularning tavsifi saqlanadi)
    console.log(`kitob: ${keep.title} (${keep.author.name})  ⟵  ${dups.length} ta takror`);
    if (APPLY) {
      await prisma.edition.updateMany({ where: { bookId: { in: dups.map((d) => d.id) } }, data: { bookId: keep.id } });
      const cyrl = keep.titleCyrl ?? dups.find((d) => d.titleCyrl)?.titleCyrl ?? null;
      await prisma.book.update({
        where: { id: keep.id },
        data: {
          titleCyrl: cyrl,
          searchCount: keep.searchCount + dups.reduce((s, d) => s + d.searchCount, 0),
          searchKey: buildSearchKey(keep.title, cyrl, keep.author.name, keep.author.nameCyrl),
        },
      });
      await prisma.book.deleteMany({ where: { id: { in: dups.map((d) => d.id) } } });
    }
    mergedBooks += dups.length;
  }
  console.log(`\n${APPLY ? "Birlashtirildi" : "Birlashtiriladi"}: ${mergedAuthors} ta muallif, ${mergedBooks} ta kitob.${APPLY ? "" : " (--apply bilan qo'llang)"}`);
}

main().finally(() => prisma.$disconnect());
