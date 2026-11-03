/**
 * Takror mualliflar va kitoblarni birlashtirish (katalog importidan keyin).
 *   npm run merge-duplicates            — o'zgartirishlarni ko'rsatadi (hech narsa o'zgarmaydi)
 *   npm run merge-duplicates -- --apply — birlashtiradi
 * Muallif: normallashtirilgan ism bir xil. Kitob: normallashtirilgan nom va muallif bir xil.
 * Qo'lda kiritilgan (yoki eng eski) yozuv saqlanadi; nashrlar (va ularning narxlari) unga o'tkaziladi.
 * Teskarisi ham: bitta kitobga yopishib qolgan turli jildlar (havolada "7-juz", "2-kitob")
 * alohida kitoblarga ajratiladi.
 */
import { prisma } from "../lib/db";
import { buildSearchKey, searchKey, slugify } from "../lib/normalize";

const APPLY = process.argv.includes("--apply");

function groups<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    m.set(k, [...(m.get(k) ?? []), r]);
  }
  return Array.from(m.values()).filter((g) => g.length > 1);
}

async function main() {
  // 1) mualliflar
  const authors = await prisma.author.findMany({ orderBy: { id: "asc" }, include: { _count: { select: { books: true } } } });
  let mergedAuthors = 0;
  for (const g of groups(authors, (a) => searchKey(a.name))) {
    // biografiyasi bor (qo'lda yozilgan) muallif, so'ng kitobi ko'pi saqlanadi
    const [keep, ...dups] = g.sort((a, b) => Number(!!b.bio) - Number(!!a.bio) || b._count.books - a._count.books);
    console.log(`muallif: ${keep.name}  ⟵  ${dups.map((d) => d.name).join(", ")}`);
    if (APPLY) {
      await prisma.book.updateMany({ where: { authorId: { in: dups.map((d) => d.id) } }, data: { authorId: keep.id } });
      await prisma.author.deleteMany({ where: { id: { in: dups.map((d) => d.id) } } });
      if (!keep.nameCyrl) {
        const cyrl = dups.find((d) => d.nameCyrl)?.nameCyrl;
        if (cyrl) await prisma.author.update({ where: { id: keep.id }, data: { nameCyrl: cyrl, searchKey: buildSearchKey(keep.name, cyrl) } });
      }
    }
    mergedAuthors += dups.length;
  }

  // 2) kitoblar
  const books = await prisma.book.findMany({ orderBy: { createdAt: "asc" }, include: { author: true } });
  let mergedBooks = 0;
  for (const g of groups(books, (b) => `${searchKey(b.title)}|${b.authorId}`)) {
    // qo'lda kiritilgan (admin panel, seed) kitob, bo'lmasa eng eskisi saqlanadi
    const [keep, ...dups] = [...g].sort((a, b) => Number(b.origin === "manual") - Number(a.origin === "manual"));
    console.log(`kitob: ${keep.title} (${keep.author.name})  ⟵  ${dups.length} ta takror`);
    if (APPLY) {
      await prisma.edition.updateMany({ where: { bookId: { in: dups.map((d) => d.id) } }, data: { bookId: keep.id } });
      const cyrl = keep.titleCyrl ?? dups.find((d) => d.titleCyrl)?.titleCyrl ?? null;
      await prisma.book.update({
        where: { id: keep.id },
        data: {
          titleCyrl: cyrl,
          description: keep.description || dups.find((d) => d.description)?.description || "",
          origin: g.some((b) => b.origin === "manual") ? "manual" : keep.origin,
          searchCount: keep.searchCount + dups.reduce((s, d) => s + d.searchCount, 0),
          searchKey: buildSearchKey(keep.title, cyrl, keep.author.name, keep.author.nameCyrl),
        },
      });
      await prisma.book.deleteMany({ where: { id: { in: dups.map((d) => d.id) } } });
    }
    mergedBooks += dups.length;
  }
  // 3) jildlarni ajratish
  const splitBooks = await splitVolumes();

  console.log(
    `\n${APPLY ? "Bajarildi" : "Bajariladi"}: ${mergedAuthors} ta muallif va ${mergedBooks} ta kitob birlashtirish, ` +
      `${splitBooks} ta jild ajratish.${APPLY ? "" : " (--apply bilan qo'llang)"}`,
  );
}

const UNIT: Record<string, string> = { juz: "juz", jild: "jild", kitob: "kitob", qism: "qism", tom: "tom" };

/** Havoladan jild belgisi: ".../hadis-va-hayot-namoz-7-juz" → "7-juz" */
export function volumeOf(url: string): string | null {
  const last = decodeURIComponent(url.split("?")[0].split("/").filter(Boolean).pop() ?? "").toLowerCase();
  const m = last.match(/(?:^|-)(\d{1,3})-(juz|jild|kitob|qism|tom)(?:-|$)/) ?? last.match(/(?:^|-)(juz|jild|kitob|qism|tom)-(\d{1,3})(?:-|$)/);
  if (!m) return null;
  const [n, unit] = /\d/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
  return `${Number(n)}-${UNIT[unit]}`;
}

async function splitVolumes(): Promise<number> {
  const books = await prisma.book.findMany({
    where: { editions: { some: {} } },
    include: { author: true, editions: { include: { offers: { select: { url: true } } } } },
  });
  let created = 0;
  for (const book of books) {
    if (book.editions.length < 2) continue;
    const byVol = new Map<string, typeof book.editions>();
    for (const e of book.editions) {
      const vols = new Set(e.offers.map((o) => (o.url ? volumeOf(o.url) : null)).filter(Boolean) as string[]);
      if (vols.size !== 1) continue; // belgisiz yoki noaniq — joyida qoladi
      const v = [...vols][0];
      byVol.set(v, [...(byVol.get(v) ?? []), e]);
    }
    if (byVol.size < 2) continue;
    const vols = [...byVol.keys()].sort((a, b) => parseInt(a) - parseInt(b));
    console.log(`jildlar: ${book.title} → ${vols.join(", ")}`);
    if (!APPLY) {
      created += vols.length - 1;
      continue;
    }
    const base = book.title.replace(/\s+\d+-(juz|jild|kitob|qism|tom)$/i, "");
    for (const [i, v] of vols.entries()) {
      const title = `${base} ${v}`;
      const sk = buildSearchKey(title, book.titleCyrl ? `${book.titleCyrl} ${v}` : null, book.author.name, book.author.nameCyrl);
      if (i === 0) {
        await prisma.book.update({ where: { id: book.id }, data: { title, searchKey: sk } });
        continue;
      }
      let slug = slugify(title);
      for (let k = 2; await prisma.book.findUnique({ where: { slug } }); k++) slug = `${slugify(title)}-${k}`;
      const nb = await prisma.book.create({
        data: {
          slug, title, titleCyrl: book.titleCyrl ? `${book.titleCyrl} ${v}` : null, description: "",
          authorId: book.authorId, coverColor: book.coverColor, searchKey: sk,
        },
      });
      await prisma.edition.updateMany({ where: { id: { in: byVol.get(v)!.map((e) => e.id) } }, data: { bookId: nb.id } });
      created++;
    }
  }
  return created;
}

main().finally(() => prisma.$disconnect());
