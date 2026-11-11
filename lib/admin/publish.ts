import { prisma } from "../db";
import { AdminError, createBook, linkUnmatched } from "./books";
import { cleanTitle } from "../collector/match";
import { detectLanguage } from "../collector/create-book";
import { isReligiousText } from "../collector/religion";
import { normalizeIsbn } from "../collector/isbn";
import { searchKey } from "../normalize";
import { UNKNOWN_AUTHOR, looksEnglish, looksNonBook, stripSeriesPrefix } from "../language";

export type PublishResult = "linked" | "created";

export type PublishOptions = {
  /** diniy adabiyot — faqat admin "E'tiborsiz" ro'yxatidan o'zi tanlaganda */
  allowReligious?: boolean;
  /** kitob emasdek ko'ringan mahsulot (pazl, marker…) — faqat admin bittalab tanlaganda */
  allowNonBook?: boolean;
};

export type PublishPlan =
  | { action: "link"; editionId: string; title: string }
  | { action: "create"; title: string; language?: string }
  | { action: "skip"; reason: "religious" | "nonbook" | "noinfo" | "matched"; title: string };

type Item = { id: string; key: string; title: string; author: string | null; isbn: string | null; price: number; inStock: boolean; status: string; seller: { name: string; type: string } };

/** Nima qilinishini aniqlaydi (bazaga yozmaydi). */
export async function planPublish(item: Item, opts: PublishOptions = {}): Promise<PublishPlan> {
  const title = stripSeriesPrefix(cleanTitle(item.title).trim() || item.title.trim());
  if (item.status === "MATCHED") return { action: "skip", reason: "matched", title };
  if (!opts.allowReligious && isReligiousText(title)) return { action: "skip", reason: "religious", title };
  if (!opts.allowNonBook && looksNonBook(item.title)) return { action: "skip", reason: "nonbook", title };

  // 1) ISBN bo'yicha
  const isbn = normalizeIsbn(item.isbn ?? undefined) ?? null;
  if (isbn) {
    const ed = await prisma.edition.findFirst({ where: { isbn }, select: { id: true } });
    if (ed) return { action: "link", editionId: ed.id, title };
  }
  // 2) aynan shu nom (va muallif bo'lsa — o'sha muallif) bo'yicha
  const key = searchKey(title);
  const sameTitle = await prisma.book.findMany({
    where: { searchKey: { startsWith: key } },
    select: { title: true, author: { select: { name: true } }, editions: { select: { id: true }, take: 1 } },
    take: 20,
  });
  const authorKey = item.author ? searchKey(item.author) : null;
  const same = sameTitle.find(
    (b) => searchKey(b.title) === key && b.editions.length && (!authorKey || searchKey(b.author.name).split(" ").some((w) => w.length > 2 && authorKey.includes(w))),
  );
  if (same) return { action: "link", editionId: same.editions[0].id, title };
  // ISBN ham, muallif ham yo'q — ko'pincha kitob emas (termos, o'yinchoq…): ommaviy chiqarishda yangi kitob yaratilmaydi
  if (!opts.allowNonBook && !isbn && !item.author?.trim()) return { action: "skip", reason: "noinfo", title };
  const language = detectLanguage({ key: item.key, title, price: item.price, inStock: item.inStock }) ?? (looksEnglish(title) ? "en" : undefined);
  return { action: "create", title, language };
}

/** Rejani bajaradi: mavjud nashrga ulaydi yoki yangi kitob yaratib ulaydi. */
export async function executePlan(item: Item, plan: PublishPlan): Promise<PublishResult> {
  if (plan.action === "skip") throw new AdminError("O'tkazib yuborildi");
  if (plan.action === "link") {
    await linkUnmatched(item.id, plan.editionId);
    return "linked";
  }
  const isbn = normalizeIsbn(item.isbn ?? undefined) ?? null;
  const bookId = await createBook(
    { title: plan.title, titleCyrl: "", author: item.author?.trim() || UNKNOWN_AUTHOR, description: "" },
    {
      isbn: isbn ?? "",
      publisher: item.seller.type === "PUBLISHER" ? item.seller.name : "Ko'rsatilmagan",
      year: "",
      pages: "",
      cover: "",
      imageUrl: "",
      imageSource: "",
      language: plan.language && plan.language !== "uz" ? plan.language : undefined,
    },
  );
  const ed = await prisma.edition.findFirstOrThrow({ where: { bookId }, select: { id: true } });
  await linkUnmatched(item.id, ed.id);
  return "created";
}

export function loadItem(itemId: string) {
  return prisma.unmatchedItem.findUniqueOrThrow({ where: { id: itemId }, include: { seller: { select: { name: true, type: true } } } });
}

const SKIP_TEXT = {
  matched: "Bu mahsulot allaqachon saytda.",
  religious: "diniy adabiyot: uni \"E'tiborsiz\" ro'yxatidan o'zingiz tanlab chiqarasiz.",
  nonbook: "kitob emasga o'xshaydi (pazl, marker, daftar…) — kerak bo'lsa, mahsulot sahifasidan bittalab chiqaring.",
  noinfo: "ISBN ham, muallif ham yo'q — ko'pincha kitob emas; kerak bo'lsa, bittalab \"Saytga chiqarish\" bilan chiqaring.",
} as const;

/**
 * "Saytga chiqarish": moslanmagan mahsulotni saytda ko'rinadigan qiladi.
 * Bazada shu ISBN yoki aynan shu nom (muallif bo'lsa — o'sha muallif) bo'lsa narx unga ulanadi,
 * aks holda mahsulotdan yangi kitob yaratiladi.
 */
export async function publishUnmatched(itemId: string, opts: PublishOptions = {}): Promise<PublishResult> {
  const item = await loadItem(itemId);
  const plan = await planPublish(item, opts);
  if (plan.action === "skip") throw new AdminError(plan.reason === "matched" ? SKIP_TEXT.matched : `«${plan.title}» — ${SKIP_TEXT[plan.reason]}`);
  return executePlan(item, plan);
}
