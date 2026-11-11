/**
 * Importda avtomatik qo'shilgan diniy kitoblarni olib tashlash (nom/nashriyot bo'yicha).
 *   npm run remove-religious            — ro'yxatni ko'rsatadi
 *   npm run remove-religious -- --apply — olib tashlaydi
 * Faqat origin = "import" kitoblar; qo'lda kiritilganlarga tegilmaydi. Havolalar "e'tiborsiz"
 * deb belgilanadi, shuning uchun keyingi importda qayta qo'shilmaydi.
 * (Do'kon kategoriyasi bo'yicha tekshiruv `npm run collect` dagi qayta tekshiruvda bajariladi.)
 */
import { prisma } from "../lib/db";
import { isReligiousText } from "../lib/collector/religion";
import { removeOffersByUrl } from "../lib/collector/apply";

const APPLY = process.argv.includes("--apply");

async function main() {
  const books = await prisma.book.findMany({
    where: { origin: "import" },
    include: { editions: { include: { offers: { select: { url: true, sellerId: true } } } } },
  });
  const bySeller = new Map<string, string[]>();
  let n = 0;
  for (const b of books) {
    const religious =
      isReligiousText(b.title) ||
      (b.titleCyrl ? isReligiousText(b.titleCyrl) : false) ||
      b.editions.some((e) => isReligiousText("", e.publisher));
    if (!religious) continue;
    n++;
    if (!APPLY && n <= 300) console.log(`  ${b.title}  [${b.editions.map((e) => e.publisher).join(", ")}]`);
    for (const e of b.editions)
      for (const o of e.offers) if (o.url) bySeller.set(o.sellerId, [...(bySeller.get(o.sellerId) ?? []), o.url]);
  }
  if (!APPLY) {
    console.log(`\n${n} ta kitob olib tashlanadi. (--apply bilan qo'llang)`);
    return;
  }
  let removed = 0;
  for (const [sellerId, urls] of bySeller) removed += await removeOffersByUrl(sellerId, urls);
  console.log(`Olib tashlandi: ${n} ta kitob (${removed} ta taklif).`);
}

main().finally(() => prisma.$disconnect());
