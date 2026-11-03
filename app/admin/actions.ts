"use server";

import { redirect } from "next/navigation";
import type { SellerType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { checkPassword, endSession, requireAdmin, startSession, adminEnabled } from "@/lib/admin/auth";
import {
  AdminError, acceptPending, addEdition, createBook, deleteBook, deleteEdition, deleteOffer, linkUnmatched,
  optionalUrl, rejectPending, saveOffer, updateBook, updateEdition, type EditionInput,
} from "@/lib/admin/books";
import { buildSearchKey, slugify } from "@/lib/normalize";

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
  await run(`/admin/kitoblar/${id}`, () =>
    updateBook(id, { title: s(data, "title"), titleCyrl: s(data, "titleCyrl"), author: s(data, "author"), description: s(data, "description") }),
    "Saqlandi.",
  );
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
  return {
    name,
    type,
    city,
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

