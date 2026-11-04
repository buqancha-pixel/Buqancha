"use server";

import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { AdminError, createBook, deleteOffer, optionalUrl, saveOffer } from "@/lib/admin/books";
import { endPartnerSession, partnerActive, requirePartner, sellerByToken, startPartnerSession } from "@/lib/partner/auth";
import { isReligiousText } from "@/lib/collector/religion";
import { importFeed } from "@/lib/collector/run";
import { docxRows, rowsToCsv, xlsxRows } from "@/lib/collector/parsers/office";
import { parseLocation } from "@/lib/geo";

const s = (d: FormData, k: string) => String(d.get(k) ?? "").trim();

function withMsg(path: string, key: "ok" | "xato", msg: string) {
  const [p, h] = path.split("#");
  return `${p}${p.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(msg)}${h ? `#${h}` : ""}`;
}

/** Hamkor amali: faqat o'z do'koni, faqat kabinet faol bo'lsa. */
async function run(back: string, fn: (sellerId: string, slug: string) => Promise<string | void>): Promise<never> {
  const seller = await requirePartner();
  if (!partnerActive(seller)) redirect(withMsg("/hamkor", "xato", "Kabinet muddati tugagan. Uzaytirish uchun Buqanchaga yozing."));
  let msg = "Saqlandi.";
  try {
    const m = await fn(seller.id, seller.slug);
    if (m) msg = m;
  } catch (e) {
    const text = e instanceof AdminError ? e.message : "Kutilmagan xato. Qayta urinib ko'ring.";
    if (!(e instanceof AdminError)) console.error(e);
    redirect(withMsg(back, "xato", text));
  }
  // saytdagi keshlangan sahifalar darhol yangilansin
  revalidateTag(CATALOG_TAG);
  redirect(withMsg(back, "ok", msg));
}

async function ownOffer(offerId: string, sellerId: string) {
  const o = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!o || o.sellerId !== sellerId) throw new AdminError("Bu narx sizga tegishli emas.");
  return o;
}

// ---------- kirish ----------

export async function partnerLogin(data: FormData) {
  await new Promise((r) => setTimeout(r, 400));
  const seller = await sellerByToken(s(data, "k"));
  if (!seller) redirect(withMsg("/hamkor/kirish", "xato", "Havola eskirgan yoki noto'g'ri. Yangi havola uchun Buqanchaga yozing."));
  await startPartnerSession(seller);
  redirect("/hamkor");
}

export async function partnerLogout() {
  await endPartnerSession();
  redirect("/hamkor/kirish");
}

// ---------- narxlar ----------

export async function savePartnerOffer(data: FormData) {
  await run(s(data, "back") || "/hamkor#narxlar", async (sellerId) => {
    const o = await ownOffer(s(data, "id"), sellerId);
    await saveOffer(o.editionId, { sellerId, price: s(data, "price"), url: s(data, "url"), inStock: data.get("inStock") === "on" }, "PARTNER");
    return "Narx saqlandi.";
  });
}

export async function deletePartnerOffer(data: FormData) {
  await run(s(data, "back") || "/hamkor#narxlar", async (sellerId) => {
    const o = await ownOffer(s(data, "id"), sellerId);
    await deleteOffer(o.id);
    return "Narx o'chirildi.";
  });
}

export async function addPartnerOffer(data: FormData) {
  await run("/hamkor#qoshish", async (sellerId) => {
    const ed = await prisma.edition.findUnique({ where: { id: s(data, "editionId") } });
    if (!ed) throw new AdminError("Nashr topilmadi.");
    await saveOffer(ed.id, { sellerId, price: s(data, "price"), url: s(data, "url"), inStock: data.get("inStock") !== "off" }, "PARTNER");
    return "Narx qo'shildi — kitob sahifasida ko'rinadi.";
  });
}

export async function createPartnerBook(data: FormData) {
  await run("/hamkor#yangi", async (sellerId) => {
    const title = s(data, "title");
    const publisher = s(data, "publisher");
    if (!s(data, "isbn")) throw new AdminError("ISBN kiriting — u kitobni boshqa do'konlardagi narxlar bilan bog'laydi.");
    if (isReligiousText(title, publisher))
      throw new AdminError("Diniy adabiyotni qo'shish uchun Buqanchaga yozing — bu bo'limni sayt egasi boshqaradi.");
    const bookId = await createBook(
      { title, titleCyrl: "", author: s(data, "author"), description: "" },
      { isbn: s(data, "isbn"), publisher, year: s(data, "year"), pages: "", cover: "", imageUrl: "", imageSource: "", language: s(data, "language") },
      "partner",
    );
    const ed = await prisma.edition.findFirstOrThrow({ where: { bookId } });
    await saveOffer(ed.id, { sellerId, price: s(data, "price"), url: s(data, "url"), inStock: true }, "PARTNER");
    return "Kitob qo'shildi va narxingiz yozildi.";
  });
}

export async function uploadPartnerFeed(data: FormData) {
  await run("/hamkor#fayl", async (_sellerId, slug) => {
    const file = data.get("file");
    if (!(file instanceof File) || !file.size) throw new AdminError("Faylni tanlang.");
    if (file.size > 4_000_000) throw new AdminError("Fayl juda katta (4 MB gacha). Ro'yxatni ikkiga bo'lib yuklang.");
    const name = file.name.toLowerCase();
    let body: string;
    let format: "csv" | "json" = "csv";
    try {
      if (name.endsWith(".xlsx")) body = rowsToCsv(xlsxRows(new Uint8Array(await file.arrayBuffer())));
      else if (name.endsWith(".docx")) body = rowsToCsv(docxRows(new Uint8Array(await file.arrayBuffer())));
      else if (name.endsWith(".csv") || name.endsWith(".txt")) body = await file.text();
      else if (name.endsWith(".json")) {
        body = await file.text();
        format = "json";
      } else if (name.endsWith(".xls") || name.endsWith(".doc"))
        throw new AdminError("Eski format. Excel/Word'da \"Saqlash\" → .xlsx yoki .docx tanlang.");
      else throw new AdminError("Excel (.xlsx), Word (.docx) yoki CSV fayl yuklang.");
    } catch (e) {
      if (e instanceof AdminError) throw e;
      throw new AdminError(`Fayl o'qilmadi: ${(e as Error).message}`);
    }
    const res = await importFeed(slug, body, format, { fullCatalog: data.get("full") === "on", createBooks: true });
    const st = res.stats;
    if (res.status === "FAILED") throw new AdminError(`Fayl o'qilmadi: ${res.error ?? st.errors[0] ?? "noma'lum xato"}`);
    return `Fayl qabul qilindi: ${st.seen} ta qator — ${st.created} ta yangi narx, ${st.updated} ta yangilandi, ${st.unchanged} ta o'zgarmadi${
      st.newBooks ? `, ${st.newBooks} ta yangi kitob qo'shildi` : ""
    }${st.unmatched ? `, ${st.unmatched} tasi qo'shilmadi (ISBN yoki muallif yo'q)` : ""}${st.religious ? `, ${st.religious} ta diniy kitob o'tkazildi` : ""}${
      st.markedOut ? `, ${st.markedOut} tasi "sotuvda yo'q"` : ""
    }${st.errors.length ? `. Xatolar: ${st.errors.slice(0, 3).join("; ")}` : ""}.`;
  });
}

// ---------- ma'lumotlar ----------

export async function savePartnerProfile(data: FormData) {
  await run("/hamkor#malumot", async (sellerId) => {
    const locRaw = s(data, "location");
    const loc = locRaw ? parseLocation(locRaw) : null;
    if (locRaw && !loc) throw new AdminError("Joylashuv tushunarsiz: \"41.311, 69.240\" ko'rinishida yoki Google/Yandex xarita havolasini kiriting.");
    const city = s(data, "city");
    if (city.length < 2) throw new AdminError("Shaharni kiriting.");
    await prisma.seller.update({
      where: { id: sellerId },
      data: {
        city,
        address: s(data, "address") || null,
        website: optionalUrl(s(data, "website"), "Sayt"),
        social: s(data, "social") || null,
        description: s(data, "description").slice(0, 500) || null,
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
      },
    });
    return "Ma'lumotlar saqlandi.";
  });
}
