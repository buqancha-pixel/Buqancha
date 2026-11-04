"use server";

import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/cache";
import type { SellerType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { checkPassword, endSession, isAdmin, requireAdmin, startSession, adminEnabled } from "@/lib/admin/auth";
import {
  AdminError, acceptPending, addEdition, mergeBookInto, createBook, deleteBook, deleteEdition, deleteOffer, linkUnmatched,
  optionalUrl, rejectPending, saveOffer, updateBook, updateEdition, type EditionInput,
} from "@/lib/admin/books";
import { buildSearchKey, slugify } from "@/lib/normalize";
import { parseLocation } from "@/lib/geo";
import { hashToken, newToken, termUntil } from "@/lib/partner/auth";
import { ContactError, normalizeInstagram, normalizePhone, normalizeTelegram, normalizeYoutube } from "@/lib/contacts";
import { cleanNote } from "@/lib/promoters";
import { deletePromoterPhoto, savePromoterPhoto } from "@/lib/promoter/photo";
import { deleteSellerPhoto, saveSellerPhoto } from "@/lib/seller/photo";

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

const TYPES: SellerType[] = ["STORE", "ONLINE", "PUBLISHER", "MARKETPLACE"];

/** Telefon, Telegram, Instagram — formatini tekshirib. */
function contactFields(d: FormData) {
  try {
    return { phone: normalizePhone(s(d, "phone")), telegram: normalizeTelegram(s(d, "telegram")), instagram: normalizeInstagram(s(d, "instagram")) };
  } catch (e) {
    if (e instanceof ContactError) throw new AdminError(e.message);
    throw e;
  }
}

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
    ...contactFields(d),
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
    const slug = await uniqueSellerSlug(f.name);
    const created = await prisma.seller.create({ data: { ...f, slug } });
    // ilgari o'chirilgan sotuvchi qayta qo'shilsa — sinxronlash uni endi o'tkazib yubormaydi
    await prisma.removedSeller.deleteMany({ where: { slug } });
    return `/admin/sotuvchilar/${created.id}`;
  }, "Sotuvchi saqlandi.");
}

/** Sotuvchini barcha narxlari bilan o'chirish; kitoblar qoladi (boshqa sotuvchilarda bo'lishi mumkin). */
async function removeSellers(ids: string[]): Promise<number> {
  const sellers = await prisma.seller.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true, name: true } });
  for (const x of sellers) {
    // shu sotuvchi saytidan olingan muqova rasmlari (manba ko'rsatilgan) — olib tashlanadi
    await prisma.edition.updateMany({ where: { imageSource: x.slug }, data: { imageUrl: null, imageSource: null } });
    await prisma.removedSeller.upsert({ where: { slug: x.slug }, create: { slug: x.slug, name: x.name }, update: { name: x.name, removedAt: new Date() } });
    await prisma.seller.delete({ where: { id: x.id } }); // narxlar, tarix, yig'ish jurnali — cascade
  }
  return sellers.length;
}

export async function deleteSellerAction(data: FormData) {
  const id = s(data, "id");
  await run(`/admin/sotuvchilar/${id}#ochirish`, async () => {
    if (s(data, "confirm") !== "ha") throw new AdminError("O'chirish uchun tasdiqlash belgisini qo'ying.");
    await removeSellers([id]);
    return "/admin/sotuvchilar";
  }, "Sotuvchi va uning narxlari o'chirildi.");
}

export async function bulkDeleteSellersAction(data: FormData) {
  const ids = data.getAll("ids").map(String).filter(Boolean);
  const back = s(data, "back").startsWith("/admin/sotuvchilar") ? s(data, "back") : "/admin/sotuvchilar";
  await run(back, async () => {
    if (!ids.length) throw new AdminError("Avval o'chiriladigan sotuvchilarni belgilang.");
    if (s(data, "confirm") !== "ha") throw new AdminError("Pastdagi \"Ha, o'chirilsin\" belgisini qo'ying.");
    await removeSellers(ids);
  }, `${ids.length} ta sotuvchi o'chirildi.`);
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
    return `/admin/sotuvchilar/${id}?havola=${encodeURIComponent(token)}`;
  }, "Yangi kirish havolasi yaratildi. Eski havola endi ishlamaydi.");
}

export async function partnerTermAction(data: FormData) {
  const id = s(data, "id");
  const term = s(data, "days");
  await run(`/admin/sotuvchilar/${id}#hamkor`, async () => {
    const seller = await prisma.seller.findUniqueOrThrow({ where: { id } });
    if (term === "0") {
      await prisma.seller.update({ where: { id }, data: { partnerTokenHash: null, partnerUntil: null } });
      return;
    }
    let until: Date;
    try {
      until = termUntil(term, seller.partnerUntil);
    } catch {
      throw new AdminError("Muddat noto'g'ri.");
    }
    await prisma.seller.update({ where: { id }, data: { partnerUntil: until, partnerSince: seller.partnerSince ?? new Date() } });
  }, term === "0" ? "Hamkorlik bekor qilindi, havola o'chirildi." : term === "muddatsiz" ? "Muddatsiz qilindi." : "Muddat uzaytirildi.");
}

/**
 * Tez ochish: faqat nom va muddat. Sotuvchi (sukut — onlayn do'kon) yaratiladi, kabinet havolasi beriladi;
 * aloqa, kitoblar va narxlarni do'kon o'zi kabinetda kiritadi.
 */
export async function quickPartnerAction(data: FormData) {
  let token = "";
  await run("/admin/sotuvchilar", async () => {
    const name = s(data, "name").slice(0, 80);
    if (name.length < 2) throw new AdminError("Do'kon nomini kiriting.");
    const type = (TYPES.includes(s(data, "type") as SellerType) ? s(data, "type") : "ONLINE") as SellerType;
    let until: Date;
    try {
      until = termUntil(s(data, "term") || "30", null);
    } catch {
      throw new AdminError("Muddatni tanlang.");
    }
    const exists = await prisma.seller.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
    if (exists) throw new AdminError(`«${exists.name}» allaqachon bor — uning sahifasidan kabinet oching.`);
    const slug = await uniqueSellerSlug(name);
    token = newToken();
    const created = await prisma.seller.create({
      data: { name, slug, type, city: type === "ONLINE" ? "Onlayn" : "Toshkent", partnerTokenHash: hashToken(token), partnerSince: new Date(), partnerUntil: until },
    });
    await prisma.removedSeller.deleteMany({ where: { slug } });
    return `/admin/sotuvchilar/${created.id}?havola=${encodeURIComponent(token)}`;
  }, "Do'kon ochildi. Havolani va yo'riqnomani do'konga yuboring.");
}

// ---------- kitob targ'ibotchilari ----------

function promoterSocials(d: FormData) {
  try {
    return { telegram: normalizeTelegram(s(d, "telegram")), youtube: normalizeYoutube(s(d, "youtube")) };
  } catch (e) {
    throw new AdminError(e instanceof ContactError ? e.message : "Havola noto'g'ri.");
  }
}

function instagramHandle(raw: string): string {
  const h = raw.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(h)) throw new AdminError("Instagram username noto'g'ri (masalan: shakhreads).");
  return h;
}

export async function savePromoterAction(data: FormData) {
  const id = s(data, "id");
  await run(id ? `/admin/targibotchilar/${id}` : "/admin/targibotchilar/yangi", async () => {
    const name = s(data, "name");
    if (name.length < 2) throw new AdminError("Ismini kiriting.");
    const photo = optionalUrl(s(data, "photoUrl"), "Rasm havolasi");
    if (photo && !photo.startsWith("https://")) throw new AdminError("Rasm havolasi https:// bilan boshlanishi kerak.");
    const fields = {
      name,
      instagram: instagramHandle(s(data, "instagram")),
      followers: s(data, "followers").slice(0, 30) || null,
      about: s(data, "about").slice(0, 600) || null,
      photoUrl: photo,
      position: Number(s(data, "position")) || 0,
      consent: data.get("consent") === "on",
      active: data.get("active") === "on",
      ...promoterSocials(data),
    };
    if (id) {
      await prisma.promoter.update({ where: { id }, data: fields });
      return `/admin/targibotchilar/${id}`;
    }
    const base = slugify(name).slice(0, 60) || "bloger";
    let slug = base;
    for (let i = 2; await prisma.promoter.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    const created = await prisma.promoter.create({ data: { ...fields, slug } });
    return `/admin/targibotchilar/${created.id}`;
  }, "Saqlandi.");
}

export async function deletePromoterAction(data: FormData) {
  const id = s(data, "id");
  await run(`/admin/targibotchilar/${id}`, async () => {
    if (s(data, "confirm") !== "ha") throw new AdminError("O'chirish uchun tasdiqlash belgisini qo'ying.");
    await prisma.promoter.delete({ where: { id } });
    return "/admin/targibotchilar";
  }, "O'chirildi.");
}

export async function addPromoterBookAction(data: FormData) {
  const id = s(data, "id");
  await run(`/admin/targibotchilar/${id}#kitoblar`, async () => {
    const bookId = s(data, "bookId");
    const note = cleanNote(String(data.get("note") ?? ""));
    await prisma.promoterBook.upsert({
      where: { promoterId_bookId: { promoterId: id, bookId } },
      create: { promoterId: id, bookId, note },
      update: { note },
    });
  }, "Kitob tavsiyalarga qo'shildi.");
}

export async function removePromoterBookAction(data: FormData) {
  const id = s(data, "id");
  await run(`/admin/targibotchilar/${id}#kitoblar`, async () => {
    await prisma.promoterBook.delete({ where: { promoterId_bookId: { promoterId: id, bookId: s(data, "bookId") } } });
  }, "Olib tashlandi.");
}

// ---------- bloger kabineti ----------

export async function promoterLinkAction(data: FormData) {
  const id = s(data, "id");
  let token = "";
  await run(`/admin/targibotchilar/${id}#kabinet`, async () => {
    token = newToken();
    await prisma.promoter.update({ where: { id }, data: { tokenHash: hashToken(token) } });
    // havola faqat bir marta ko'rsatiladi (bazada saqlanmaydi)
    return `/admin/targibotchilar/${id}?havola=${encodeURIComponent(token)}#kabinet`;
  }, "Yangi kirish havolasi yaratildi. Eski havola endi ishlamaydi.");
}

export async function promoterRevokeAction(data: FormData) {
  const id = s(data, "id");
  await run(`/admin/targibotchilar/${id}#kabinet`, async () => {
    await prisma.promoter.update({ where: { id }, data: { tokenHash: null } });
  }, "Kabinet yopildi, havola o'chirildi.");
}

// ---------- saytdan tezkor o'chirish (admin kirgan bo'lsa katalog va kitob sahifasida) ----------

export async function quickDeleteBookAction(id: string): Promise<{ ok: boolean; message: string }> {
  if (!(await isAdmin())) return { ok: false, message: "Avval admin panelga kiring." };
  try {
    const book = await prisma.book.findUnique({ where: { id }, select: { title: true } });
    if (!book) return { ok: true, message: "Kitob allaqachon o'chirilgan." };
    await deleteBook(id);
    revalidateTag(CATALOG_TAG);
    return { ok: true, message: `«${book.title}» o'chirildi.` };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "O'chirib bo'lmadi. Qayta urinib ko'ring." };
  }
}

export async function adminPromoterPhotoAction(data: FormData) {
  const id = s(data, "id");
  await run(`/admin/targibotchilar/${id}#rasm`, () => savePromoterPhoto(id, data.get("photo")), "Rasm yuklandi.");
}

export async function adminRemovePromoterPhotoAction(data: FormData) {
  const id = s(data, "id");
  await run(`/admin/targibotchilar/${id}#rasm`, () => deletePromoterPhoto(id), "Rasm olib tashlandi.");
}

export async function adminSellerPhotoAction(data: FormData) {
  const id = s(data, "id");
  await run(`/admin/sotuvchilar/${id}#rasm`, () => saveSellerPhoto(id, data.get("photo")), "Rasm yuklandi.");
}

export async function adminRemoveSellerPhotoAction(data: FormData) {
  const id = s(data, "id");
  await run(`/admin/sotuvchilar/${id}#rasm`, () => deleteSellerPhoto(id), "Rasm olib tashlandi.");
}
