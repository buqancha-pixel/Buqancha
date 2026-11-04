import { prisma } from "./db";
import { cached } from "./cache";
import { bookCardInclude } from "./books";
import { AdminError } from "./admin/books";

/** Saytda faqat rozilik olingan va faol targ'ibotchilar ko'rinadi. */
const visible = { consent: true, active: true } as const;

export const getPromoters = cached(
  () =>
    prisma.promoter.findMany({
      where: visible,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: {
        _count: { select: { books: true } },
        books: { take: 4, orderBy: { createdAt: "desc" }, include: { book: { include: bookCardInclude } } },
      },
    }),
  "promoters",
  300, // GitHub'dagi skriptlar keshni tozalay olmaydi — qisqa muddat
);

export const getPromoter = cached(
  (slug: string) =>
    prisma.promoter.findFirst({
      where: { slug, ...visible },
      include: {
        // mahkamlanganlar (ko'pi bilan 3 ta) birinchi
        books: { orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], include: { book: { include: bookCardInclude } } },
        readingBook: { include: bookCardInclude },
        lists: {
          orderBy: { createdAt: "desc" },
          include: {
            _count: { select: { books: true } },
            books: { take: 4, orderBy: { position: "asc" }, include: { book: { include: { editions: { select: { imageUrl: true, imageSource: true } } } } } },
          },
        },
      },
    }),
  "promoter-v2",
  300,
);

/** Bloger to'plami sahifasi. */
export const getPromoterList = cached(
  (promoterSlug: string, listSlug: string) =>
    prisma.promoterList.findFirst({
      where: { slug: listSlug, promoter: { slug: promoterSlug, ...visible } },
      include: {
        promoter: true,
        books: { orderBy: { position: "asc" }, include: { book: { include: bookCardInclude } } },
      },
    }),
  "promoter-list",
  300,
);

/** Kitobni tavsiya qilgan targ'ibotchilar (kitob sahifasi uchun). */
export const getBookPromoters = cached(
  (bookId: string) =>
    prisma.promoterBook.findMany({
      where: { bookId, promoter: visible },
      include: { promoter: { select: { id: true, slug: true, name: true, instagram: true, photoUrl: true, photoAt: true } } },
      // rating ham keladi (PromoterBook maydoni)
      orderBy: { createdAt: "asc" },
    }),
  "book-promoters",
  300,
);

export function instagramUrl(handle: string) {
  return `https://www.instagram.com/${handle.replace(/^@/, "")}/`;
}

/** Rasm bo'lmasa — ism bosh harflaridan avatar rangi. */
export function avatarColor(name: string) {
  const colors = ["#7a2e2e", "#4a3b6b", "#1d3557", "#2a6f97", "#9b2226", "#588157", "#bc6c25", "#0f4c5c", "#8d5a97"];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return colors[h % colors.length];
}

/** Profil rasmi manzili: yuklangan rasm (bazada) yoki admin kiritgan havola. */
export function promoterPhotoSrc(p: { id: string; photoAt?: Date | null; photoUrl?: string | null }): string | null {
  if (p.photoAt) return `/rasm/bloger/${p.id}?v=${new Date(p.photoAt).getTime()}`;
  return p.photoUrl ?? null;
}

/** Banner manzili (yuklanmagan bo'lsa null — sahifada muqovalar kollaji). */
export function promoterBannerSrc(p: { id: string; bannerAt?: Date | null }): string | null {
  return p.bannerAt ? `/rasm/bloger/${p.id}/banner?v=${new Date(p.bannerAt).getTime()}` : null;
}

/** Tavsiya matni: 500 so'zgacha (va 4000 belgigacha). */
export const NOTE_MAX_WORDS = 500;
export const NOTE_MAX_CHARS = 4000;
export function noteWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Tavsiya matnini tekshiradi: bo'sh bo'lsa null; 500 so'zdan oshsa — xato. */
export function cleanNote(raw: string): string | null {
  const text = raw.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return null;
  const words = noteWords(text);
  if (words > NOTE_MAX_WORDS) throw new AdminError(`Tavsiya matni ${words} so'z — ko'pi bilan ${NOTE_MAX_WORDS} so'z bo'lishi kerak.`);
  if (text.length > NOTE_MAX_CHARS) throw new AdminError(`Tavsiya matni juda uzun (${NOTE_MAX_CHARS} belgigacha).`);
  return text;
}
