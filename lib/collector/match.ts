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
  | { editionId: string; by: "isbn" | "title" }
  | { editionId: null; reason: string };

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
  const isbn = normalizeIsbn(item.isbn);
  if (isbn) {
    const hit = index.byIsbn.get(isbn);
    if (hit) return { editionId: hit.editionId, by: "isbn" };
  }

  const itemTitle = searchKey(item.title);
  const itemAuthor = item.author ? searchKey(item.author).split(" ").filter((t) => t.length >= 3) : [];

  let best: { len: number; book: MatchIndex["books"][number] }[] = [];
  for (const book of index.books) {
    for (const tk of book.titleKeys) {
      if (!tk || !contains(itemTitle, tk)) continue;
      const authorOk = itemAuthor.length
        ? itemAuthor.some((t) => book.authorTokens.has(t))
        : itemTitle === tk || Array.from(book.authorTokens).some((t) => contains(itemTitle, t));
      if (!authorOk) continue;
      if (!best.length || tk.length > best[0].len) best = [{ len: tk.length, book }];
      else if (tk.length === best[0].len && best[0].book !== book) best.push({ len: tk.length, book });
    }
  }

  if (!best.length) return { editionId: null, reason: "kitob topilmadi" };
  if (best.length > 1) return { editionId: null, reason: "bir nechta kitobga mos keladi" };

  const { editions } = best[0].book;
  if (editions.length === 1) return { editionId: editions[0].editionId, by: "title" };
  if (item.publisher) {
    const pk = searchKey(item.publisher);
    const byPub = editions.filter((e) => {
      const ek = searchKey(e.publisher);
      return contains(pk, ek) || contains(ek, pk);
    });
    if (byPub.length === 1) return { editionId: byPub[0].editionId, by: "title" };
  }
  return { editionId: null, reason: "nashr aniq emas (bir nechta nashr)" };
}
