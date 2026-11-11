/**
 * Ichki bo'limi bor kitoblarga asosiy bo'limni qo'shish (O'zbek adabiyoti → Badiiy adabiyot ham).
 *   npm run fill-category-parents
 */
import { prisma } from "../lib/db";
import { withParents } from "../lib/categories";

async function main() {
  const books = await prisma.book.findMany({ where: { NOT: { categories: { isEmpty: true } } }, select: { id: true, categories: true } });
  let n = 0;
  for (const b of books) {
    const next = withParents(b.categories);
    if (next.length !== b.categories.length || next.some((c) => !b.categories.includes(c))) {
      await prisma.book.update({ where: { id: b.id }, data: { categories: next } });
      n++;
    }
  }
  console.log(`${n} ta kitobga asosiy bo'lim qo'shildi (${books.length} ta bo'limli kitobdan).`);
}

main().finally(() => prisma.$disconnect());
