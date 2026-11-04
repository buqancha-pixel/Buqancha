"use server";

import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/cache";
import type { SellerType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { checkPassword, endSession, requireAdmin, startSession, adminEnabled } from "@/lib/admin/auth";
import {
  AdminError, acceptPending, addEdition, mergeBookInto, createBook, deleteBook, deleteEdition, deleteOffer, linkUnmatched,
  optionalUrl, rejectPending, saveOffer, updateBook, updateEdition, type EditionInput,
} from "@/lib/admin/books";
import { buildSearchKey, slugify } from "@/lib/normalize";
import { parseLocation } from "@/lib/geo";
import { CATEGORY_BY_SLUG } from "@/lib/categories";
import { hashToken, newToken } from "@/lib/partner/auth";

const s = (d: FormData, k: string) => String(d.get(k) ?? "").trim();

function withMsg(path: string, key: "ok" | "xato", msg: string) {
  const [p, h] = path.split("#");
  return `${p}${p.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(msg)}${h ? `#${h}` : ""}`;
}

/** Amalni bajaradi; xato bo'lsa — o'sha sahifaga xabar bilan qaytaradi. */
async function run(back: string, fn: () => Promise<string | void>, okMsg: string): Promise<never> {
  await requireAdmin();
  let to = back;
  try {
    const next = await fn();
    if (next) to = next;
  } catch (e) {
    const msg = e instanceof AdminError ? e.message : "Kutilmagan xato. Qayta urinib ko'ring.";
    if (!(e instanceof AdminError)) console.error(e);
    redirect(withMsg(back, "xato", msg));
  }
  // saytdagi keshlangan sahifalar darhol yangilansin
  revalidateTag(CATALOG_TAG);
  redirect(withMsg(to, "ok", okMsg));
}

const editionInput = (d: FormData): EditionInput => ({
  isbn: s(d, "isbn"),
  publisher: s(d, "publisher"),
  year: s(d, "year"),
  pages: s(d, "pages"),
  cover: s(d, "cover"),
  imageUrl: s(d, "imageUrl"),
  imageSource: s(d, "imageSource"),
  language: s(d, "language"),
});

// ---------- kirish ----------

export async function login(data: FormData) {
  if (!adminEnabled()) redirect("/admin/kirish");
  // parol tanlashni sekinlashtirish uchun kichik pauza
  await new Promise((r) => setTimeout(r, 600));
  if (!(await checkPassword(s(data, "password")))) redirect(withMsg("/admin/kirish", "xato", "Parol noto'g'ri."));
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/kirish");
}

// ---------- kitoblar ----------

export async function createBookAction(data: FormData) {
  const from = s(data, "from");
  await run(
    `/admin/kitoblar/yangi${from ? `?from=${from}` : ""}`,
    async () => {
      const id = await createBook(
        { title: s(data, "title"), titleCyrl: s(data, "titleCyrl"), author: s(data, "author"), description: s(data, "description") },
        editionInput(data),
      );
      // moslanmagan mahsulotdan yaratilgan bo'lsa — narxi ham bog'lanadi
      if (from) {
        const ed = await prisma.edition.findFirstOrThrow({ where: { bookId: id } });
        await linkUnmatched(from, ed.id);
      }
      return `/admin/kitoblar/${id}`;
    },
    from ? "Kitob qo'shildi va narx bog'landi." : "Kitob qo'shildi. Endi narx qo'shing.",
  );
}

export async function updateBookAction(data: FormData) {
  const id = s(data, "id");
  await run(`/admin/kitoblar/${id}`, async () => {
    await updateBook(id, { title: s(data, "title"), titleCyrl: s(data, "titleCyrl"), author: s(data, "author"), description: s(data, "description") });
    const picked = data.getAll("categories").map(String).filter((c) => CATEGORY_BY_SLUG.has(c));
    await prisma.book.update({ where: { id }, data: { categories: [...new Set(picked)] } });
  }, "Saqlandi.");
}

export async function setFeaturedAction(data: FormData) {
  const id = s(data, "id");
  const on = data.get("featured") === "on";
  await run(`/admin/kitoblar/${id}#banner`, async () => {
    const note = s(data, "featuredNote").slice(0, 40) || null;
    const book = await prisma.book.findUniqueOrThrow({ where: { id } });
    await prisma.book.update({
      where: { id },
      // yangi tanlangan kitob banner boshiga chiqadi; yozuvni o'zgartirish tartibni buzmaydi
      data: { featuredAt: on ? (book.featuredAt ?? new Date()) : null, featuredNote: on ? note : null },
    });
  }, on ? "Bannerga chiqarildi." : "Bannerdan olindi.");
}

export async function mergeBookAction(data: FormData) {
  const id = s(data, "id");
  const intoId = s(data, "intoId");
  await run(`/admin/kitoblar/${id}#birlashtirish`, async () => {
    const lang = s(data, "language");
    await mergeBookInto(id, intoId, lang === "keep" ? undefined : lang || null);
    return `/admin/kitoblar/${intoId}#nashrlar`;
  }, "Kitob nashr sifatida qo'shildi.");
}

export async function deleteBookAction(data: FormData) {
  const id = s(data, "id");
  await run(`/admin/kitoblar/${id}`, async () => {
    if (s(data, "confirm") !== "ha") throw new AdminError("O'chirish uchun tasdiqlash belgisini qo'ying.");
    await deleteBook(id);
    return "/admin/kitoblar";
  }, "Kitob o'chirildi.");
}

export async function addEditionAction(data: FormData) {
  const bookId = s(data, "bookId");
  await run(`/admin/kitoblar/${bookId}#nashrlar`, () => addEdition(bookId, editionInput(data)).then(() => undefined), "Nashr qo'shildi.");
}

export async function updateEditionAction(data: FormData) {
  const bookId = s(data, "bookId");
  await run(`/admin/kitoblar/${bookId}#nashrlar`, () => updateEdition(s(data, "id"), editionInput(data)), "Nashr saqlandi.");
}

export async function deleteEditionAction(data: FormData) {
  const bookId = s(data, "bookId");
  await run(`/admin/kitoblar/${bookId}#nashrlar`, () => deleteEdition(s(data, "id")), "Nashr o'chirildi.");
}

// ---------- narxlar ----------

export async function saveOfferAction(data: FormData) {
  const bookId = s(data, "bookId");
  await run(`/admin/kitoblar/${bookId}#nashrlar`, () =>
    saveOffer(s(data, "editionId"), { sellerId: s(data, "sellerId"), price: s(data, "price"), url: s(data, "url"), inStock: data.get("inStock") === "on" }),
    "Narx saqlandi.",
  );
}

export async function deleteOfferAction(data: FormData) {
  const bookId = s(data, "bookId");
  await run(`/admin/kitoblar/${bookId}#nashrlar`, () => deleteOffer(s(data, "id")), "Narx o'chirildi.");
}

export async function pendingAction(data: FormData) {
  const accept = s(data, "do") === "accept";
  await run("/admin/korib-chiqish", () => (accept ? acceptPending(s(data, "id")) : rejectPending(s(data, "id"))),
    accept ? "Yangi narx qabul qilindi." : "Eski narx qoldirildi.");
}

// ---------- moslanmagan mahsulotlar ----------

export async function linkUnmatchedAction(data: FormData) {
  const id = s(data, "id");
  await run(`/admin/korib-chiqish/${id}`, async () => {
    await linkUnmatched(id, s(data, "editionId"));
    return "/admin/korib-chiqish?tab=moslanmagan";
  }, "Bog'landi — narx kitob sahifasida chiqadi.");
}

export async function linkAsNewEditionAction(data: FormData) {
  const id = s(data, "id");
  await run(`/admin/korib-chiqish/${id}`, async () => {
    const edId = await addEdition(s(data, "bookId"), editionInput(data));
    await linkUnmatched(id, edId);
    return "/admin/korib-chiqish?tab=moslanmagan";
  }, "Yangi nashr qo'shildi va narx bog'landi.");
}

export async function setUnmatchedStatusAction(data: FormData) {
  const status = s(data, "status") === "PENDING" ? "PENDING" : "IGNORED";
  const back = s(data, "back") || "/admin/korib-chiqish?tab=moslanmagan";
  await run(back, async () => {
    await prisma.unmatchedItem.update({ where: { id: s(data, "id") }, data: { status } });
  }, status === "IGNORED" ? "E'tiborsiz qoldirildi." : "Navbatga qaytarildi.");
}

// ---------- sotuvchilar ----------

const TYPES: SellerType[] = ["STORE", "PUBLISHER", "MARKETPLACE"];

function sellerFields(d: FormData) {
  const name = s(d, "name");
  if (name.length < 2) throw new AdminError("Nomini kiriting.");
  const type = s(d, "type") as SellerType;
  if (!TYPES.includes(type)) throw new AdminError("Turini tanlang.");
  const city = s(d, "city");
  if (city.length < 2) throw new AdminError("Shaharni kiriting.");
  const locRaw = s(d, "location");
  const loc = locRaw ? parseLocation(locRaw) : null;
  if (locRaw && !loc)
    throw new AdminError("Joylashuv tushunarsiz: \"41.311, 69.240\" ko'rinishida yoki Google/Yandex xarita havolasini kiriting (qisqa goo.gl havola ishlamaydi).");
  return {
    name,
    type,
    city,
    lat: loc?.lat ?? null,
    lng: loc?.lng ?? null,
    website: optionalUrl(s(d, "website"), "Sayt"),
    description: s(d, "description") || null,
    address: s(d, "address") || null,
    social: s(d, "social") || null,
    allowImages: d.get("allowImages") === "on",
  };
}

export async function saveSellerAction(data: FormData) {
  const id = s(data, "id");
  await run(id ? `/admin/sotuvchilar/${id}` : "/admin/sotuvchilar/yangi", async () => {
    const f = sellerFields(data);
    if (id) {
      await prisma.seller.update({ where: { id }, data: f });
      if (!f.allowImages) {
        const seller = await prisma.seller.findUniqueOrThrow({ where: { id } });
        await prisma.edition.updateMany({ where: { imageSource: seller.slug }, data: { imageUrl: null, imageSource: null } });
      }
      return `/admin/sotuvchilar/${id}`;
    }
    const created = await prisma.seller.create({ data: { ...f, slug: await uniqueSellerSlug(f.name) } });
    return `/admin/sotuvchilar/${created.id}`;
  }, "Sotuvchi saqlandi.");
}

async function uniqueSellerSlug(name: string) {
  const base = slugify(name).slice(0, 60) || "sotuvchi";
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    if (!(await prisma.seller.findUnique({ where: { slug } }))) return slug;
  }
}

// ---------- mualliflar ----------

export async function updateAuthorAction(data: FormData) {
  const id = s(data, "id");
  const bookId = s(data, "bookId");
  await run(`/admin/kitoblar/${bookId}`, async () => {
    const name = s(data, "name");
    if (name.length < 2) throw new AdminError("Muallif ismini kiriting.");
    const nameCyrl = s(data, "nameCyrl") || null;
    const birthYear = s(data, "birthYear") ? Number(s(data, "birthYear")) : null;
    const deathYear = s(data, "deathYear") ? Number(s(data, "deathYear")) : null;
    for (const y of [birthYear, deathYear]) if (y !== null && (!Number.isInteger(y) || y < 0 || y > 2100)) throw new AdminError("Yil noto'g'ri.");
    const author = await prisma.author.update({
      where: { id },
      data: { name, nameCyrl, bio: s(data, "bio") || null, birthYear, deathYear, searchKey: buildSearchKey(name, nameCyrl) },
      include: { books: { select: { id: true, title: true, titleCyrl: true } } },
    });
    for (const b of author.books)
      await prisma.book.update({ where: { id: b.id }, data: { searchKey: buildSearchKey(b.title, b.titleCyrl, name, nameCyrl) } });
  }, "Muallif saqlandi.");
}


// ---------- katalog bo'limlari (tezkor) ----------

async function setCategories(ids: string[], slug: string, mode: "add" | "remove") {
  if (!CATEGORY_BY_SLUG.has(slug)) throw new AdminError("Bo'limni tanlang.");
  const books = await prisma.book.findMany({ where: { id: { in: ids } }, select: { id: true, categories: true } });
  for (const b of books) {
    const next = mode === "add" ? [...new Set([...b.categories, slug])] : b.categories.filter((c) => c !== slug);
    if (next.length !== b.categories.length) await prisma.book.update({ where: { id: b.id }, data: { categories: next } });
  }
  return books.length;
}

function safeBack(d: FormData) {
  const b = s(d, "back");
  return b.startsWith("/admin/kitoblar") ? b : "/admin/kitoblar";
}

export async function bulkCategoryAction(data: FormData) {
  const ids = data.getAll("ids").map(String);
  const mode = s(data, "mode") === "remove" ? "remove" : "add";
  const slug = data.getAll("bolim").map(String).find((v) => CATEGORY_BY_SLUG.has(v)) ?? "";
  await run(safeBack(data), async () => {
    if (!ids.length) throw new AdminError("Avval kitoblarni belgilang.");
    await setCategories(ids, slug, mode);
  }, mode === "add" ? `${ids.length} ta kitob bo'limga qo'shildi.` : `${ids.length} ta kitob bo'limdan olib tashlandi.`);
}

export async function quickCategoryAction(data: FormData) {
  const [id, slug] = s(data, "quick").split("|");
  await run(safeBack(data), () => setCategories([id], slug, "add").then(() => undefined), `«${CATEGORY_BY_SLUG.get(slug)?.name ?? slug}» bo'limiga qo'shildi.`);
}

export async function removeCategoryAction(data: FormData) {
  const [id, slug] = s(data, "remove").split("|");
  await run(safeBack(data), () => setCategories([id], slug, "remove").then(() => undefined), "Bo'limdan olib tashlandi.");
}

// ---------- hamkorlar kabineti ----------

export async function partnerLinkAction(data: FormData) {
  const id = s(data, "id");
  let token = "";
  await run(`/admin/sotuvchilar/${id}#hamkor`, async () => {
    const seller = await prisma.seller.findUniqueOrThrow({ where: { id } });
    token = newToken();
    const now = new Date();
    await prisma.seller.update({
      where: { id },
      data: {
        partnerTokenHash: hashToken(token),
        partnerSince: seller.partnerSince ?? now,
        // birinchi marta — 30 kunlik bepul sinov
        partnerUntil: seller.partnerUntil ?? new Date(now.getTime() + 30 * 864e5),
      },
    });
    // havola faqat bir marta ko'rsatiladi (bazada saqlanmaydi)
    return `/admin/sotuvchilar/${id}?havola=${encodeURIComponent(token)}#hamkor`;
  }, "Yangi kirish havolasi yaratildi. Eski havola endi ishlamaydi.");
}

export async function partnerTermAction(data: FormData) {
  const id = s(data, "id");
  const days = Number(s(data, "days"));
  await run(`/admin/sotuvchilar/${id}#hamkor`, async () => {
    const seller = await prisma.seller.findUniqueOrThrow({ where: { id } });
    if (days === 0) {
      await prisma.seller.update({ where: { id }, data: { partnerTokenHash: null, partnerUntil: null } });
      return;
    }
    if (!Number.isInteger(days) || days < 1 || days > 800) throw new AdminError("Muddat noto'g'ri.");
    const base = seller.partnerUntil && seller.partnerUntil > new Date() ? seller.partnerUntil : new Date();
    await prisma.seller.update({ where: { id }, data: { partnerUntil: new Date(base.getTime() + days * 864e5), partnerSince: seller.partnerSince ?? new Date() } });
  }, days === 0 ? "Hamkorlik bekor qilindi, havola o'chirildi." : `Muddat ${days} kunga uzaytirildi.`);
}
