"use server";

import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { AdminError } from "@/lib/admin/books";
import { endPromoterSession, promoterByToken, requirePromoter, startPromoterSession } from "@/lib/promoter/auth";
import { deletePromoterPhoto, savePromoterPhoto } from "@/lib/promoter/photo";
import { cleanNote } from "@/lib/promoters";
import { ContactError, normalizeTelegram, normalizeYoutube } from "@/lib/contacts";

const s = (d: FormData, k: string) => String(d.get(k) ?? "").trim();

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

const MAX_BOOKS = 300;

export async function addPromoterRecommendation(data: FormData) {
  const q = s(data, "q");
  await run(`/bloger${q ? `?q=${encodeURIComponent(q)}` : ""}#qoshish`, async (id) => {
    const bookId = s(data, "bookId");
    const book = await prisma.book.findUnique({ where: { id: bookId }, select: { title: true } });
    if (!book) throw new AdminError("Kitob topilmadi.");
    if ((await prisma.promoterBook.count({ where: { promoterId: id } })) >= MAX_BOOKS) throw new AdminError(`Ko'pi bilan ${MAX_BOOKS} ta kitob.`);
    const note = cleanNote(String(data.get("note") ?? ""));
    await prisma.promoterBook.upsert({
      where: { promoterId_bookId: { promoterId: id, bookId } },
      create: { promoterId: id, bookId, note },
      update: { note },
    });
    return `«${book.title}» tavsiyalaringizga qo'shildi.`;
  });
}

export async function updatePromoterNote(data: FormData) {
  await run("/bloger#tavsiyalar", async (id) => {
    const bookId = s(data, "bookId");
    // where'da promoterId — boshqa blogerning yozuviga tegib bo'lmaydi
    const r = await prisma.promoterBook.updateMany({ where: { promoterId: id, bookId }, data: { note: cleanNote(String(data.get("note") ?? "")) } });
    if (!r.count) throw new AdminError("Bu kitob tavsiyalaringizda yo'q.");
  }, "Izoh saqlandi.");
}

export async function removePromoterRecommendation(data: FormData) {
  await run("/bloger#tavsiyalar", async (id) => {
    const r = await prisma.promoterBook.deleteMany({ where: { promoterId: id, bookId: s(data, "bookId") } });
    if (!r.count) throw new AdminError("Bu kitob tavsiyalaringizda yo'q.");
  }, "Tavsiyalardan olib tashlandi.");
}

export async function uploadPromoterPhoto(data: FormData) {
  await run("/bloger#rasm", (id) => savePromoterPhoto(id, data.get("photo")), "Rasm yuklandi.");
}

export async function removePromoterPhoto() {
  await run("/bloger#rasm", (id) => deletePromoterPhoto(id), "Rasm olib tashlandi.");
}
