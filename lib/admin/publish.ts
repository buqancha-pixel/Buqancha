import { prisma } from "../db";
import { AdminError, createBook, linkUnmatched } from "./books";
import { cleanTitle } from "../collector/match";
import { detectLanguage } from "../collector/create-book";
import { isReligiousText } from "../collector/religion";
import { normalizeIsbn } from "../collector/isbn";
import { searchKey } from "../normalize";
import { looksEnglish } from "../language";

export type PublishResult = "linked" | "created";



/**
 * "Saytga chiqarish": moslanmagan mahsulotni saytda ko'rinadigan qiladi.
 * Diniy adabiyot faqat `allowReligious` bilan (admin "E'tiborsiz" ro'yxatidan o'zi tanlaganda).
 * Avval bazadan xuddi shu ISBN yoki nomdagi (va muallif bo'lsa — o'sha muallifdagi) kitob qidiriladi — topilsa,
 * narx unga ulanadi; topilmasa, mahsulotdan yangi kitob yaratiladi. Diniy adabiyot bu yo'l bilan chiqmaydi.
 */
export async function publishUnmatched(itemId: string, opts: { allowReligious?: boolean } = {}): Promise<PublishResult> {
  const item = await prisma.unmatchedItem.findUniqueOrThrow({ where: { id: itemId }, include: { seller: { select: { name: true, type: true } } } });
  if (item.status === "MATCHED") throw new AdminError("Bu mahsulot allaqachon saytda.");
  const title = cleanTitle(item.title).trim() || item.title.trim();
  // diniy adabiyot faqat sayt egasi o'zi tanlaganda ("E'tiborsiz" ro'yxatidan) chiqadi
  if (!opts.allowReligious && isReligiousText(title))
    throw new AdminError(`«${title}» — diniy adabiyot: uni "E'tiborsiz" ro'yxatidan o'zingiz tanlab chiqarasiz.`);

  // 1) ISBN bo'yicha
  const isbn = normalizeIsbn(item.isbn ?? undefined) ?? null;
  if (isbn) {
    const ed = await prisma.edition.findFirst({ where: { isbn }, select: { id: true } });
    if (ed) {
      await linkUnmatched(item.id, ed.id);
      return "linked";
    }
  }
  // 2) aynan shu nom (va muallif) bo'yicha
  const key = searchKey(title);
  const sameTitle = await prisma.book.findMany({
    where: { searchKey: { startsWith: key } },
    select: { id: true, title: true, author: { select: { name: true } }, editions: { select: { id: true }, take: 1 } },
    take: 20,
  });
  const authorKey = item.author ? searchKey(item.author) : null;
  const same = sameTitle.find(
    (b) => searchKey(b.title) === key && b.editions.length && (!authorKey || searchKey(b.author.name).split(" ").some((w) => w.length > 2 && authorKey.includes(w))),
  );
  if (same) {
    await linkUnmatched(item.id, same.editions[0].id);
    return "linked";
  }
  // 3) yangi kitob
  const language = detectLanguage({ key: item.key, title, price: item.price, inStock: item.inStock }) ?? (looksEnglish(title) ? "en" : undefined);
  const bookId = await createBook(
    { title, titleCyrl: "", author: item.author?.trim() || "Muallif ko'rsatilmagan", description: "" },
    {
      isbn: isbn ?? "",
      publisher: item.seller.type === "PUBLISHER" ? item.seller.name : "Ko'rsatilmagan",
      year: "",
      pages: "",
      cover: "",
      imageUrl: "",
      imageSource: "",
      language: language && language !== "uz" ? language : undefined,
    },
  );
  const ed = await prisma.edition.findFirstOrThrow({ where: { bookId }, select: { id: true } });
  await linkUnmatched(item.id, ed.id);
  return "created";
}
