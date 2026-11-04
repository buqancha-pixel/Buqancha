/**
 * Admin panel uchun kitob, nashr va narx amallari (qo'lda kiritish).
 * Qo'lda qo'shilgan kitoblar origin="manual" — avtomatik tozalash ularga tegmaydi
 * (diniy adabiyot filtri ham), lekin narxlari sotuvchi sahifasidan yangilanib turadi.
 */
import { prisma } from "../db";
import { buildSearchKey, slugify } from "../normalize";
import { normalizeIsbn } from "../collector/isbn";
import { LANGUAGE_LABEL } from "../format";
import { colorFor, displayPair, findOrCreateAuthor, uniqueSlug } from "../collector/create-book";

export class AdminError extends Error {}

/** "39 000", "39000 so'm" → 39000 */
export function parseSum(raw: string): number {
  const n = Number(raw.replace(/[^\d]/g, ""));
  if (!Number.isInteger(n) || n < 500 || n > 50_000_000) throw new AdminError("Narxni so'mda kiriting, masalan 39 000.");
  return n;
}

export function optionalInt(raw: string, min: number, max: number, label: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < min || n > max) throw new AdminError(`${label} noto'g'ri.`);
  return n;
}

export function optionalIsbn(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const isbn = normalizeIsbn(t);
  if (!isbn) throw new AdminError("ISBN noto'g'ri (10 yoki 13 raqam, nazorat raqami mos kelishi kerak).");
  return isbn;
}

export function optionalUrl(raw: string, label = "Havola"): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    return u.toString();
  } catch {
    throw new AdminError(`${label} noto'g'ri — https:// bilan boshlanishi kerak.`);
  }
}

async function assertIsbnFree(isbn: string | null, exceptEditionId?: string) {
  if (!isbn) return;
  const other = await prisma.edition.findUnique({ where: { isbn }, include: { book: true } });
  if (other && other.id !== exceptEditionId) throw new AdminError(`Bu ISBN allaqachon bor: "${other.book.title}" kitobida.`);
}

/**
 * O'chirilgan narxlarning havolalarini "e'tiborsiz" deb eslab qolamiz — aks holda
 * kechki katalog importi o'sha sahifani yana topib, kitobni qaytadan yaratadi.
 */
async function rememberIgnored(where: { id?: string; editionId?: string; edition?: { bookId: string } }) {
  const offers = await prisma.offer.findMany({
    where: { ...where, url: { not: null }, isSample: false },
    include: { edition: { include: { book: { include: { author: true } } } } },
  });
  for (const o of offers) {
    const data = {
      title: o.edition.book.title,
      author: o.edition.book.author.name,
      isbn: o.edition.isbn,
      price: o.price,
      inStock: o.inStock,
      url: o.url,
      status: "IGNORED" as const,
    };
    await prisma.unmatchedItem.upsert({
      where: { sellerId_key: { sellerId: o.sellerId, key: o.url! } },
      create: { sellerId: o.sellerId, key: o.url!, ...data },
      update: data,
    });
  }
}

export async function refreshSearchKey(bookId: string) {
  const b = await prisma.book.findUniqueOrThrow({ where: { id: bookId }, include: { author: true } });
  await prisma.book.update({
    where: { id: bookId },
    data: { searchKey: buildSearchKey(b.title, b.titleCyrl, b.author.name, b.author.nameCyrl) },
  });
}

export type BookInput = {
  title: string;
  titleCyrl: string;
  author: string;
  description: string;
};

export type EditionInput = {
  isbn: string;
  publisher: string;
  year: string;
  pages: string;
  cover: string;
  imageUrl: string;
  imageSource: string;
  language?: string;
};

function bookFields(input: BookInput) {
  if (input.title.trim().length < 2) throw new AdminError("Kitob nomini kiriting.");
  if (input.author.trim().length < 2) throw new AdminError("Muallifni kiriting.");
  const { latin, cyrl } = displayPair(input.title);
  const titleCyrl = input.titleCyrl.trim() || cyrl;
  return { title: latin, titleCyrl: titleCyrl || null, description: input.description.trim() };
}

function editionFields(input: EditionInput) {
  if (input.publisher.trim().length < 2) throw new AdminError("Nashriyotni kiriting.");
  const imageUrl = optionalUrl(input.imageUrl, "Rasm havolasi");
  if (imageUrl && !imageUrl.startsWith("https://")) throw new AdminError("Rasm havolasi https:// bilan boshlanishi kerak.");
  const cover = input.cover === "qattiq" || input.cover === "yumshoq" ? input.cover : null;
  return {
    isbn: optionalIsbn(input.isbn),
    publisher: input.publisher.trim(),
    year: optionalInt(input.year, 1800, new Date().getFullYear() + 1, "Yil"),
    pages: optionalInt(input.pages, 1, 10000, "Betlar soni"),
    cover,
    imageUrl,
    imageSource: imageUrl ? input.imageSource.trim() || "own" : null,
    language: input.language && LANGUAGE_LABEL[input.language] ? input.language : null,
  };
}

export async function createBook(book: BookInput, edition: EditionInput, origin: "manual" | "partner" = "manual"): Promise<string> {
  const b = bookFields(book);
  const e = editionFields(edition);
  await assertIsbnFree(e.isbn);
  const author = await findOrCreateAuthor(book.author);
  const surname = slugify(author.name).split("-").pop();
  const created = await prisma.book.create({
    data: {
      ...b,
      slug: await uniqueSlug(slugify(b.title), "book", surname),
      authorId: author.id,
      origin,
      coverColor: colorFor(b.title),
      searchKey: buildSearchKey(b.title, b.titleCyrl, author.name, author.nameCyrl),
      editions: { create: e },
    },
  });
  return created.id;
}

export async function updateBook(bookId: string, input: BookInput) {
  const b = bookFields(input);
  const author = await findOrCreateAuthor(input.author);
  await prisma.book.update({ where: { id: bookId }, data: { ...b, authorId: author.id, origin: "manual" } });
  await refreshSearchKey(bookId);
}

export async function deleteBook(bookId: string) {
  await rememberIgnored({ edition: { bookId } });
  const book = await prisma.book.delete({ where: { id: bookId } });
  // muallifning boshqa kitobi qolmagan bo'lsa (va qo'lda yozilgan biografiyasi bo'lmasa) — o'chiriladi
  const author = await prisma.author.findUnique({ where: { id: book.authorId }, include: { _count: { select: { books: true } } } });
  if (author && author._count.books === 0 && !author.bio) await prisma.author.delete({ where: { id: author.id } });
}

export async function addEdition(bookId: string, input: EditionInput): Promise<string> {
  const e = editionFields(input);
  await assertIsbnFree(e.isbn);
  const ed = await prisma.edition.create({ data: { ...e, bookId } });
  await prisma.book.update({ where: { id: bookId }, data: { origin: "manual" } });
  return ed.id;
}

export async function updateEdition(editionId: string, input: EditionInput) {
  const e = editionFields(input);
  await assertIsbnFree(e.isbn, editionId);
  await prisma.edition.update({ where: { id: editionId }, data: e });
}

export async function deleteEdition(editionId: string) {
  const ed = await prisma.edition.findUniqueOrThrow({ where: { id: editionId }, include: { book: { include: { _count: { select: { editions: true } } } } } });
  if (ed.book._count.editions <= 1) throw new AdminError("Kitobning yagona nashrini o'chirib bo'lmaydi — kitobni o'chiring.");
  await rememberIgnored({ editionId });
  await prisma.edition.delete({ where: { id: editionId } });
}

export type OfferInput = { sellerId: string; price: string; url: string; inStock: boolean };

/** Narx qo'shish yoki yangilash (bir nashr + bir sotuvchi = bitta narx). */
export async function saveOffer(editionId: string, input: OfferInput, source: "MANUAL" | "PARTNER" = "MANUAL") {
  const seller = await prisma.seller.findUnique({ where: { id: input.sellerId } });
  if (!seller) throw new AdminError("Sotuvchini tanlang.");
  const price = parseSum(input.price);
  const url = optionalUrl(input.url);
  const now = new Date();
  const offer = await prisma.offer.upsert({
    where: { editionId_sellerId: { editionId, sellerId: seller.id } },
    create: { editionId, sellerId: seller.id, price, url, inStock: input.inStock, source, lastSeenAt: now, checkedAt: now },
    update: { price, url, inStock: input.inStock, source, isSample: false, pendingPrice: null, checkedAt: now },
  });
  await prisma.priceSnapshot.create({ data: { offerId: offer.id, price, inStock: input.inStock } });
}

export async function deleteOffer(offerId: string) {
  await rememberIgnored({ id: offerId });
  await prisma.offer.delete({ where: { id: offerId } });
}

export async function acceptPending(offerId: string) {
  const o = await prisma.offer.findUniqueOrThrow({ where: { id: offerId } });
  if (o.pendingPrice == null) return;
  await prisma.offer.update({ where: { id: offerId }, data: { price: o.pendingPrice, pendingPrice: null } });
  await prisma.priceSnapshot.create({ data: { offerId, price: o.pendingPrice, inStock: o.inStock } });
}

export async function rejectPending(offerId: string) {
  await prisma.offer.update({ where: { id: offerId }, data: { pendingPrice: null } });
}

/** Moslanmagan mahsulotni mavjud nashrga bog'lash. */
export async function linkUnmatched(itemId: string, editionId: string) {
  const item = await prisma.unmatchedItem.findUniqueOrThrow({ where: { id: itemId } });
  const now = new Date();
  const offer = await prisma.offer.upsert({
    where: { editionId_sellerId: { editionId, sellerId: item.sellerId } },
    create: { editionId, sellerId: item.sellerId, price: item.price, inStock: item.inStock, url: item.url, source: "AUTO", lastSeenAt: now, checkedAt: now },
    update: { price: item.price, inStock: item.inStock, url: item.url, source: "AUTO", isSample: false, pendingPrice: null, lastSeenAt: now, checkedAt: now },
  });
  await prisma.priceSnapshot.create({ data: { offerId: offer.id, price: item.price, inStock: item.inStock } });
  await prisma.unmatchedItem.update({ where: { id: itemId }, data: { status: "MATCHED" } });
  const ed = await prisma.edition.findUniqueOrThrow({ where: { id: editionId } });
  await prisma.book.update({ where: { id: ed.bookId }, data: { origin: "manual" } });
}

/**
 * Kitobni boshqa kitobga qo'shish: barcha nashrlari (narxlari bilan) o'sha kitobga o'tadi, bu kitob o'chiriladi.
 * Masalan, "O'tkan kunlar: Bygone days" → "O'tkan kunlar" (inglizcha nashr sifatida).
 */
export async function mergeBookInto(fromId: string, intoId: string, language?: string | null) {
  if (fromId === intoId) throw new AdminError("Kitobni o'ziga qo'shib bo'lmaydi.");
  const [from, into] = await Promise.all([
    prisma.book.findUniqueOrThrow({ where: { id: fromId } }),
    prisma.book.findUniqueOrThrow({ where: { id: intoId } }),
  ]);
  await prisma.$transaction(async (tx) => {
    await tx.edition.updateMany({
      where: { bookId: fromId },
      data: { bookId: intoId, ...(language !== undefined ? { language } : {}) },
    });
    await tx.book.update({
      where: { id: intoId },
      data: {
        origin: "manual",
        searchCount: into.searchCount + from.searchCount,
        description: into.description || from.description,
        titleCyrl: into.titleCyrl ?? from.titleCyrl,
        ...(from.featuredAt && !into.featuredAt ? { featuredAt: from.featuredAt, featuredNote: from.featuredNote } : {}),
      },
    });
    await tx.book.delete({ where: { id: fromId } });
  });
  await refreshSearchKey(intoId);
  const author = await prisma.author.findUnique({ where: { id: from.authorId }, include: { _count: { select: { books: true } } } });
  if (author && author._count.books === 0 && !author.bio) await prisma.author.delete({ where: { id: author.id } });
  return into;
}
