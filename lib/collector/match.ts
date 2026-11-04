import type { CollectedItem } from "./types.ts";
import { searchKey } from "../normalize.ts";
import { normalizeIsbn } from "./isbn.ts";

export type IndexEdition = {
  editionId: string;
  bookId: string;
  isbn: string | null;
  publisher: string;
  title: string;
  titleCyrl: string | null;
  author: string;
  authorCyrl: string | null;
};

export type MatchIndex = {
  byIsbn: Map<string, IndexEdition>;
  books: Array<{
    bookId: string;
    titleKeys: string[];
    authorTokens: Set<string>;
    editions: IndexEdition[];
  }>;
};

export type MatchResult =
  | { editionId: string; bookId: string; by: "isbn" | "title" }
  /** kitob topildi, lekin mos nashr yo'q (ISBN bo'lsa — yangi nashr yaratiladi) */
  | { editionId: null; bookId: string; reason: string }
  | { editionId: null; bookId: null; reason: string };

// Nomga qo'shilsa ham kitobni o'zgartirmaydigan so'zlar
const NOISE = new Set(
  [
    "roman", "romani", "romoni", "qissa", "qissasi", "hikoya", "hikoyalar", "kitob", "kitobi", "asar", "asari",
    "qattiq", "yumshoq", "muqova", "muqovada", "muqovali", "nashr", "nashri", "yangi", "va", "uz", "lotin", "kirill",
    "tarixiy", "romon", "bet", "sahifa",
  ].map((w) => searchKey(w)),
);

/**
 * Do'kon nomidagi texnik qo'shimchalarni olib tashlaydi:
 * "O'tkan kunlar (А5, qattiq) 400 bet" → "O'tkan kunlar".
 * Qavs ichidagi "2-kitob", "3-jild" kabi belgilar saqlanadi — ular boshqa mahsulotni bildiradi.
 */
export function cleanTitle(title: string): string {
  // qavs ichidagi jild belgisi ("(2-kitob)") saqlanadi — qavslar olib tashlanadi
  const keep: string[] = [];
  let t = title.replace(/\([^)]*\)|\[[^\]]*\]/g, (part) => {
    for (const m of part.matchAll(/\b\d+\s*-?\s*(kitob|jild|qism|tom|kitoblar|juz|juzlar)\b/gi)) keep.push(m[0]);
    return " ";
  });
  t = t.replace(/\b\d+\s*(bet|sahifa|стр)\b\.?/gi, " ").replace(/\b[АAаa]\s?[3-6]\b/g, " ");
  return [t, ...keep].join(" ").replace(/\s+/g, " ").trim();
}
// Bular bo'lsa — bu boshqa mahsulot (to'plam, bir nechta jild)
const SET_WORDS = new Set(["jildlik", "komplekt", "set", "kitoblar"].map((w) => searchKey(w)));

/**
 * To'plam/bir nechta jild: "1-2-3-jild", "1-5 kitoblar", "5 ta kitob", "komplekt".
 * "Hikoyalar to'plami" kabi bitta kitob to'plam hisoblanmaydi.
 */
export function isMultiVolume(title: string): boolean {
  if (/\b\d+\s*[-–,]\s*\d+(\s*[-–,]\s*\d+)*\s*-?\s*(jild|kitob|qism|tom|juz)/i.test(title)) return true;
  if (/\b\d+\s*ta\s+(kitob|jild)/i.test(title)) return true;
  if (/\bto['‘ʻ’]?plam\b/i.test(title) && /\b\d+\s*[-–]\s*\d+\b/.test(title)) return true;
  return searchKey(title).split(" ").some((t) => SET_WORDS.has(t));
}

export function buildIndex(editions: IndexEdition[]): MatchIndex {
  const byIsbn = new Map<string, IndexEdition>();
  const books = new Map<string, MatchIndex["books"][number]>();
  for (const e of editions) {
    const isbn = normalizeIsbn(e.isbn);
    if (isbn) byIsbn.set(isbn, e);
    let b = books.get(e.bookId);
    if (!b) {
      const titleKeys = Array.from(new Set([e.title, e.titleCyrl].filter(Boolean).map((t) => searchKey(t!))));
      const authorTokens = new Set(
        [e.author, e.authorCyrl]
          .filter(Boolean)
          .flatMap((a) => searchKey(a!).split(" "))
          .filter((t) => t.length >= 3),
      );
      b = { bookId: e.bookId, titleKeys, authorTokens, editions: [] };
      books.set(e.bookId, b);
    }
    b.editions.push(e);
  }
  return { byIsbn, books: Array.from(books.values()) };
}

/** Yangi yaratilgan kitobni indeksga qo'shadi. */
export function addToIndex(index: MatchIndex, e: IndexEdition) {
  const isbn = normalizeIsbn(e.isbn);
  if (isbn) index.byIsbn.set(isbn, e);
  let b = index.books.find((x) => x.bookId === e.bookId);
  if (!b) {
    const titleKeys = Array.from(new Set([e.title, e.titleCyrl].filter(Boolean).map((t) => searchKey(t!))));
    const authorTokens = new Set(
      [e.author, e.authorCyrl].filter(Boolean).flatMap((a) => searchKey(a!).split(" ")).filter((t) => t.length >= 3),
    );
    b = { bookId: e.bookId, titleKeys, authorTokens, editions: [] };
    index.books.push(b);
  }
  b.editions.push(e);
}

const contains = (hay: string, needle: string) => ` ${hay} `.includes(` ${needle} `);

/**
 * Mahsulotni nashrga moslaydi:
 *  1) ISBN bo'yicha (eng ishonchli);
 *  2) nom bo'yicha: kitob nomi mahsulot nomida to'liq so'zlar bilan uchrashi
 *     va muallif mos kelishi kerak. Muallif berilmagan bo'lsa — nom aynan teng
 *     yoki muallif familiyasi mahsulot nomida bo'lishi kerak.
 *  Bir nechta nashr bo'lsa, nashriyot bo'yicha tanlanadi; aniq bo'lmasa — moslanmaydi.
 */
export function matchItem(item: CollectedItem, index: MatchIndex): MatchResult {
  const res = matchItemOnce(item, index);
  // "G'AFUR G'ULOM: SHUM BOLA" — ba'zi do'konlar muallifni nomga qo'shib yozadi; ikki nuqtagacha
  // bo'lgan qism muallif sifatida tekshiriladi (mos muallif bo'lmasa — hech narsa o'zgarmaydi)
  if (res.editionId === null && res.bookId === null && res.reason === "kitob topilmadi") {
    const m = item.title.match(/^([^:]{3,60}):\s*(.{2,})$/);
    if (m) {
      const retry = matchItemOnce({ ...item, title: m[2], author: m[1], authorFromBrand: false }, index);
      if (retry.bookId) return retry;
    }
  }
  return res;
}

function matchItemOnce(item: CollectedItem, index: MatchIndex): MatchResult {
  const isbn = normalizeIsbn(item.isbn);
  if (isbn) {
    const hit = index.byIsbn.get(isbn);
    if (hit) return { editionId: hit.editionId, bookId: hit.bookId, by: "isbn" };
  }
  if (item.language && item.language !== "uz") return { editionId: null, bookId: null, reason: `boshqa tilda (${item.language})` };

  const itemTitle = searchKey(cleanTitle(item.title));
  const itemTokens = itemTitle.split(" ").filter(Boolean);
  if (isMultiVolume(item.title)) return { editionId: null, bookId: null, reason: "to'plam yoki bir nechta jild" };
  const itemAuthor = item.author ? searchKey(item.author).split(" ").filter((t) => t.length >= 3) : [];

  let best: { len: number; book: MatchIndex["books"][number] }[] = [];
  for (const book of index.books) {
    for (const tk of book.titleKeys) {
      if (!tk || !contains(itemTitle, tk)) continue;
      const authorOk = itemAuthor.length
        ? itemAuthor.some((t) => book.authorTokens.has(t))
        : itemTitle === tk || Array.from(book.authorTokens).some((t) => contains(itemTitle, t));
      if (!authorOk) continue;
      // nomda kitob nomi, muallif va "shovqin" so'zlardan boshqa narsa bo'lmasligi kerak:
      // "Ufq bo'sag'asida" — "Ufq" emas, "Shum bola 2" — "Shum bola" emas
      const known = new Set([...tk.split(" "), ...book.authorTokens]);
      const extra = itemTokens.filter((t) => !known.has(t) && !NOISE.has(t) && !(t.length < 3 && /^[a-z]+$/.test(t)));
      if (extra.length) continue;
      if (!best.length || tk.length > best[0].len) best = [{ len: tk.length, book }];
      else if (tk.length === best[0].len && best[0].book !== book) best.push({ len: tk.length, book });
    }
  }

  if (!best.length) return { editionId: null, bookId: null, reason: "kitob topilmadi" };
  if (best.length > 1) return { editionId: null, bookId: null, reason: "bir nechta kitobga mos keladi" };

  const { bookId, editions } = best[0].book;
  const pk = item.publisher ? searchKey(item.publisher) : null;
  const byPub = pk
    ? editions.filter((e) => {
        const ek = searchKey(e.publisher);
        return contains(pk, ek) || contains(ek, pk);
      })
    : [];
  if (isbn) {
    // ISBN bor, lekin bazada yo'q: shu nashriyotning ISBN'siz yagona nashri bo'lsa — o'sha, aks holda yangi nashr
    const noIsbn = byPub.filter((e) => !e.isbn);
    if (noIsbn.length === 1) return { editionId: noIsbn[0].editionId, bookId, by: "title" };
    return { editionId: null, bookId, reason: "yangi nashr" };
  }
  if (byPub.length === 1) return { editionId: byPub[0].editionId, bookId, by: "title" };
  if (editions.length === 1 && !pk) return { editionId: editions[0].editionId, bookId, by: "title" };
  return { editionId: null, bookId, reason: "nashr aniq emas (bir nechta nashr)" };
}
