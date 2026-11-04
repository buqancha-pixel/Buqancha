"use server";

import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { AdminError } from "@/lib/admin/books";
import { endPromoterSession, promoterByToken, requirePromoter, startPromoterSession } from "@/lib/promoter/auth";
import { deletePromoterBanner, deletePromoterPhoto, savePromoterBanner, savePromoterPhoto } from "@/lib/promoter/photo";
import { cleanNote } from "@/lib/promoters";
import { ContactError, normalizeTelegram, normalizeYoutube } from "@/lib/contacts";
import { slugify } from "@/lib/normalize";

const s = (d: FormData, k: string) => String(d.get(k) ?? "").trim();
const MAX_BOOKS = 300;
const MAX_PINNED = 3;
const MAX_LISTS = 20;

function withMsg(path: string, key: "ok" | "xato", msg: string) {
  const [p, h] = path.split("#");
  return `${p}${p.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(msg)}${h ? `#${h}` : ""}`;
}

/** Bloger amali: faqat o'z sahifasi (promoterId sessiyadan olinadi, formadan emas). */
async function run(back: string, fn: (promoterId: string) => Promise<string | void>, okMsg = "Saqlandi."): Promise<never> {
  const p = await requirePromoter();
  if (!p.active) redirect(withMsg("/bloger", "xato", "Sahifangiz vaqtincha yopilgan. Buqanchaga yozing."));
  let msg = okMsg;
  try {
    const m = await fn(p.id);
    if (m) msg = m;
  } catch (e) {
    const text = e instanceof AdminError ? e.message : "Kutilmagan xato. Qayta urinib ko'ring.";
    if (!(e instanceof AdminError)) console.error(e);
    redirect(withMsg(back, "xato", text));
  }
  revalidateTag(CATALOG_TAG);
  redirect(withMsg(back, "ok", msg));
}

function rating(d: FormData): number | null {
  const n = Number(s(d, "rating"));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

// ---------- kirish ----------

export async function promoterLogin(data: FormData) {
  await new Promise((r) => setTimeout(r, 400));
  const p = await promoterByToken(s(data, "k"));
  if (!p) redirect(withMsg("/bloger/kirish", "xato", "Havola eskirgan yoki noto'g'ri. Yangi havola uchun Buqanchaga yozing."));
  await startPromoterSession(p);
  redirect("/bloger");
}

export async function promoterLogout() {
  await endPromoterSession();
  redirect("/bloger/kirish");
}

// ---------- profil ----------

export async function savePromoterProfile(data: FormData) {
  await run("/bloger#malumot", async (id) => {
    const name = s(data, "name");
    if (name.length < 2 || name.length > 60) throw new AdminError("Ismingizni kiriting (60 belgigacha).");
    let socials;
    try {
      socials = { telegram: normalizeTelegram(s(data, "telegram")), youtube: normalizeYoutube(s(data, "youtube")) };
    } catch (e) {
      throw new AdminError(e instanceof ContactError ? e.message : "Havola noto'g'ri.");
    }
    await prisma.promoter.update({
      where: { id },
      data: { name, about: s(data, "about").slice(0, 600) || null, followers: s(data, "followers").slice(0, 30) || null, ...socials },
    });
  }, "Ma'lumotlar saqlandi.");
}

export async function uploadPromoterPhoto(data: FormData) {
  await run("/bloger#rasm", (id) => savePromoterPhoto(id, data.get("photo")), "Rasm yuklandi.");
}

export async function removePromoterPhoto() {
  await run("/bloger#rasm", (id) => deletePromoterPhoto(id), "Rasm olib tashlandi.");
}

export async function uploadPromoterBanner(data: FormData) {
  await run("/bloger#banner", (id) => savePromoterBanner(id, data.get("photo")), "Banner yuklandi.");
}

export async function removePromoterBanner() {
  await run("/bloger#banner", (id) => deletePromoterBanner(id), "Banner olib tashlandi — sahifada muqovalaringizdan kollaj chiqadi.");
}

// ---------- tavsiyalar ----------

export async function addPromoterRecommendation(data: FormData) {
  const q = s(data, "q");
  await run(`/bloger${q ? `?q=${encodeURIComponent(q)}` : ""}#qoshish`, async (id) => {
    const bookId = s(data, "bookId");
    const book = await prisma.book.findUnique({ where: { id: bookId }, select: { title: true } });
    if (!book) throw new AdminError("Kitob topilmadi.");
    if ((await prisma.promoterBook.count({ where: { promoterId: id } })) >= MAX_BOOKS) throw new AdminError(`Ko'pi bilan ${MAX_BOOKS} ta kitob.`);
    const note = cleanNote(String(data.get("note") ?? ""));
    const r = rating(data);
    await prisma.promoterBook.upsert({
      where: { promoterId_bookId: { promoterId: id, bookId } },
      create: { promoterId: id, bookId, note, rating: r },
      update: { note, rating: r },
    });
    return `«${book.title}» tavsiyalaringizga qo'shildi.`;
  });
}

/** Tavsiya matni, baho va "eng sevimli" (mahkamlash). */
export async function updatePromoterNote(data: FormData) {
  await run("/bloger#tavsiyalar", async (id) => {
    const bookId = s(data, "bookId");
    const pinned = data.get("pinned") === "on";
    if (pinned) {
      const others = await prisma.promoterBook.count({ where: { promoterId: id, pinned: true, NOT: { bookId } } });
      if (others >= MAX_PINNED) throw new AdminError(`Ko'pi bilan ${MAX_PINNED} ta kitobni "eng sevimli" qilish mumkin — avval boshqasidan belgini oling.`);
    }
    // where'da promoterId — boshqa blogerning yozuviga tegib bo'lmaydi
    const r = await prisma.promoterBook.updateMany({
      where: { promoterId: id, bookId },
      data: { note: cleanNote(String(data.get("note") ?? "")), rating: rating(data), pinned },
    });
    if (!r.count) throw new AdminError("Bu kitob tavsiyalaringizda yo'q.");
  }, "Saqlandi.");
}

export async function removePromoterRecommendation(data: FormData) {
  await run("/bloger#tavsiyalar", async (id) => {
    const bookId = s(data, "bookId");
    const r = await prisma.promoterBook.deleteMany({ where: { promoterId: id, bookId } });
    if (!r.count) throw new AdminError("Bu kitob tavsiyalaringizda yo'q.");
    // to'plamlardan ham chiqariladi
    await prisma.promoterListBook.deleteMany({ where: { bookId, list: { promoterId: id } } });
  }, "Tavsiyalardan olib tashlandi.");
}

/** "Hozir o'qiyapman": o'z tavsiyalaridan biri yoki bo'sh (olib tashlash). */
export async function setReadingBook(data: FormData) {
  await run("/bloger#tavsiyalar", async (id) => {
    const bookId = s(data, "bookId");
    if (bookId && !(await prisma.book.findUnique({ where: { id: bookId }, select: { id: true } }))) throw new AdminError("Kitob topilmadi.");
    await prisma.promoter.update({ where: { id }, data: { readingBookId: bookId || null } });
    return bookId ? "Sahifangizda \"Hozir o'qiyapman\" bo'lib chiqadi." : "\"Hozir o'qiyapman\" olib tashlandi.";
  });
}

// ---------- to'plamlar ----------

async function ownList(listId: string, promoterId: string) {
  const l = await prisma.promoterList.findUnique({ where: { id: listId } });
  if (!l || l.promoterId !== promoterId) throw new AdminError("Bu to'plam sizga tegishli emas.");
  return l;
}

function listFields(d: FormData) {
  const title = s(d, "title").slice(0, 80);
  if (title.length < 3) throw new AdminError("To'plam nomini yozing (masalan: Yozda o'qish uchun 10 kitob).");
  return { title, about: s(d, "about").slice(0, 600) || null };
}

/** Faqat o'z tavsiyalaridan kitob tanlanadi; tartib — belgilangan tartibda. */
async function setListBooks(listId: string, promoterId: string, ids: string[]) {
  const own = new Set((await prisma.promoterBook.findMany({ where: { promoterId, bookId: { in: ids } }, select: { bookId: true } })).map((x) => x.bookId));
  const keep = ids.filter((b) => own.has(b)).slice(0, 50);
  await prisma.$transaction([
    prisma.promoterListBook.deleteMany({ where: { listId } }),
    prisma.promoterListBook.createMany({ data: keep.map((bookId, position) => ({ listId, bookId, position })) }),
  ]);
}

export async function createPromoterList(data: FormData) {
  await run("/bloger#toplamlar", async (id) => {
    if ((await prisma.promoterList.count({ where: { promoterId: id } })) >= MAX_LISTS) throw new AdminError(`Ko'pi bilan ${MAX_LISTS} ta to'plam.`);
    const f = listFields(data);
    const base = slugify(f.title).slice(0, 60) || "toplam";
    let slug = base;
    for (let i = 2; await prisma.promoterList.findUnique({ where: { promoterId_slug: { promoterId: id, slug } } }); i++) slug = `${base}-${i}`;
    const l = await prisma.promoterList.create({ data: { ...f, slug, promoterId: id } });
    await setListBooks(l.id, id, data.getAll("books").map(String));
    return `«${f.title}» to'plami yaratildi.`;
  });
}

export async function updatePromoterList(data: FormData) {
  await run("/bloger#toplamlar", async (id) => {
    const l = await ownList(s(data, "listId"), id);
    await prisma.promoterList.update({ where: { id: l.id }, data: listFields(data) });
    await setListBooks(l.id, id, data.getAll("books").map(String));
  }, "To'plam saqlandi.");
}

export async function deletePromoterList(data: FormData) {
  await run("/bloger#toplamlar", async (id) => {
    const l = await ownList(s(data, "listId"), id);
    await prisma.promoterList.delete({ where: { id: l.id } });
  }, "To'plam o'chirildi.");
}
