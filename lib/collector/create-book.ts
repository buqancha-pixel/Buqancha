import { prisma } from "../db";
import { buildSearchKey, searchKey, slugify } from "../normalize";
import { hasCyrillic, looksRussian, tidyCase, toLatinDisplay } from "../translit";
import { addToIndex, cleanTitle, type IndexEdition, type MatchIndex } from "./match";
import type { CollectedItem } from "./types";

const PALETTE = ["#7a2e2e", "#4a3b6b", "#1d3557", "#e09f3e", "#2a6f97", "#9b2226", "#6c757d", "#588157", "#3a5a40", "#bc6c25", "#f4a261", "#212529", "#0f4c5c", "#8d5a97", "#386641", "#6d597a"];

function colorFor(s: string): string {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Ko'rsatish uchun nom: kirill bo'lsa — lotinga, tinish belgilari tozalangan. */
function displayPair(raw: string): { latin: string; cyrl: string | null } {
  const t = raw.replace(/[\s:;,.–—-]+$/, "").replace(/^[\s"«“]+|[\s"»”]+$/g, "").replace(/\s+/g, " ").trim();
  if (hasCyrillic(t)) return { latin: tidyCase(toLatinDisplay(t)), cyrl: t };
  return { latin: tidyCase(t), cyrl: null };
}

export type CreateVerdict = { ok: true } | { ok: false; reason: string };

/** Mahsulotdan yangi kitob yaratish mumkinmi (ma'lumot yetarli va ishonchlimi)? */
export function canCreateBook(item: CollectedItem, isbn: string | null, sellerName: string): CreateVerdict {
  if (!isbn) return { ok: false, reason: "ISBN yo'q — yangi kitob yaratilmaydi" };
  if (!item.author || item.authorFromBrand) return { ok: false, reason: "muallif ko'rsatilmagan" };
  const ak = searchKey(item.author);
  if (ak === searchKey(sellerName) || (item.publisher && ak === searchKey(item.publisher)))
    return { ok: false, reason: "muallif o'rnida do'kon/nashriyot nomi" };
  if (item.language && item.language !== "uz") return { ok: false, reason: `boshqa tilda (${item.language})` };
  if (looksRussian(item.title)) return { ok: false, reason: "ruscha nashr" };
  const title = cleanTitle(item.title);
  if (searchKey(title).length < 2) return { ok: false, reason: "nom juda qisqa" };
  return { ok: true };
}

async function uniqueSlug(base: string, table: "book" | "author", fallbackSuffix?: string): Promise<string> {
  const exists = (slug: string) =>
    table === "book"
      ? prisma.book.findUnique({ where: { slug }, select: { id: true } })
      : prisma.author.findUnique({ where: { slug }, select: { id: true } });
  const root = base.slice(0, 80).replace(/-+$/, "") || "kitob";
  if (!(await exists(root))) return root;
  if (fallbackSuffix) {
    const withSuffix = `${root}-${fallbackSuffix}`.slice(0, 100);
    if (!(await exists(withSuffix))) return withSuffix;
  }
  for (let i = 2; ; i++) if (!(await exists(`${root}-${i}`))) return `${root}-${i}`;
}

async function findOrCreateAuthor(rawName: string) {
  // bir nechta muallif bo'lsa — birinchisi asosiy muallif
  const first = rawName.split(/\s*[,;&]\s*|\s+va\s+|\s+и\s+/)[0];
  const { latin, cyrl } = displayPair(first);
  const key = searchKey(latin);
  const found = await prisma.author.findFirst({ where: { searchKey: { contains: ` ${key} ` } } });
  if (found) return found;
  return prisma.author.create({
    data: { name: latin, nameCyrl: cyrl, slug: await uniqueSlug(slugify(latin), "author"), searchKey: buildSearchKey(latin, cyrl) },
  });
}

/** Yangi kitob, muallif (kerak bo'lsa) va ISBN'li nashr yaratadi, indeksni yangilaydi. */
export async function createBookFromItem(item: CollectedItem, isbn: string, index: MatchIndex, sellerSlug: string): Promise<string> {
  // boshqa jarayon (parallel import) shu ISBN'ni allaqachon yaratgan bo'lishi mumkin
  const existing = await prisma.edition.findUnique({
    where: { isbn },
    include: { book: { include: { author: true } } },
  });
  if (existing) {
    addToIndex(index, {
      editionId: existing.id,
      bookId: existing.bookId,
      isbn,
      publisher: existing.publisher,
      title: existing.book.title,
      titleCyrl: existing.book.titleCyrl,
      author: existing.book.author.name,
      authorCyrl: existing.book.author.nameCyrl,
    });
    return existing.id;
  }
  const author = await findOrCreateAuthor(item.author!);
  const { latin: title, cyrl } = displayPair(cleanTitle(item.title));
  const altCyrl = !cyrl && item.titleAlt && hasCyrillic(item.titleAlt) ? displayPair(cleanTitle(item.titleAlt)).cyrl : null;
  const titleCyrl = cyrl ?? altCyrl;
  const surname = slugify(author.name).split("-").pop();
  const book = await prisma.book.create({
    data: {
      slug: await uniqueSlug(slugify(title), "book", surname),
      title,
      titleCyrl,
      description: "",
      origin: "import",
      authorId: author.id,
      coverColor: colorFor(title),
      searchKey: buildSearchKey(title, titleCyrl, author.name, author.nameCyrl),
    },
  });
  const edition = await prisma.edition.create({
    data: {
      bookId: book.id,
      isbn,
      publisher: item.publisher?.slice(0, 200) || "Noma'lum",
      pages: item.pages ?? null,
      cover: item.cover ?? null,
      year: item.year ?? null,
      imageUrl: item.image ?? null,
      imageSource: item.image ? sellerSlug : null,
    },
  });
  const entry: IndexEdition = {
    editionId: edition.id,
    bookId: book.id,
    isbn,
    publisher: edition.publisher,
    title,
    titleCyrl,
    author: author.name,
    authorCyrl: author.nameCyrl,
  };
  addToIndex(index, entry);
  return edition.id;
}
