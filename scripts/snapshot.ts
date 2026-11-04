/**
 * Katalog nusxasi (snapshot): mahalliy bazadagi kitoblar, sotuvchilar va haqiqiy
 * narxlarni bitta faylga yozadi va yangi (bo'sh) bazaga yuklaydi.
 *
 *   npm run snapshot -- export            — prisma/data/catalog.json.gz ga yozadi
 *   npm run snapshot -- load              — fayldan bazaga yuklaydi (baza bo'sh bo'lishi kerak)
 *   npm run snapshot -- load --if-empty   — baza bo'sh bo'lmasa, jimgina o'tkazib yuboradi
 *
 * Namunaviy narxlar, yig'ish jurnali va hamkorlik arizalari (shaxsiy ma'lumot) kirmaydi.
 */
import { gunzipSync, gzipSync } from "node:zlib";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../lib/db";

const FILE = join(__dirname, "..", "prisma", "data", "catalog.json.gz");
const CHUNK = 1000;

type Snapshot = {
  version: 1;
  exportedAt: string;
  authors: unknown[];
  books: unknown[];
  sellers: unknown[];
  editions: unknown[];
  offers: unknown[];
  snapshots: unknown[];
  unmatched: unknown[];
};

async function exportSnapshot() {
  const offers = await prisma.offer.findMany({ where: { isSample: false }, orderBy: { id: "asc" } });
  const offerIds = new Set(offers.map((o) => o.id));
  const data: Snapshot = {
    version: 1,
    exportedAt: new Date().toISOString(),
    authors: await prisma.author.findMany({ orderBy: { id: "asc" } }),
    books: await prisma.book.findMany({ orderBy: { id: "asc" } }),
    sellers: await prisma.seller.findMany({ orderBy: { id: "asc" } }),
    editions: await prisma.edition.findMany({ orderBy: { id: "asc" } }),
    offers,
    snapshots: (await prisma.priceSnapshot.findMany({ orderBy: { id: "asc" } })).filter((s) => offerIds.has(s.offerId)),
    unmatched: await prisma.unmatchedItem.findMany({ orderBy: { id: "asc" } }),
  };
  const gz = gzipSync(JSON.stringify(data), { level: 9 });
  writeFileSync(FILE, gz);
  console.log(
    `Yozildi: ${FILE} (${(gz.length / 1024).toFixed(0)} KB) — ${data.books.length} kitob, ` +
      `${data.sellers.length} sotuvchi, ${data.offers.length} narx`,
  );
}

async function inChunks<T>(rows: T[], fn: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) await fn(rows.slice(i, i + CHUNK));
}

async function loadSnapshot(ifEmpty: boolean) {
  if (!existsSync(FILE)) throw new Error(`${FILE} topilmadi`);
  const [books, sellers] = await Promise.all([prisma.book.count(), prisma.seller.count()]);
  if (books || sellers) {
    if (ifEmpty) {
      console.log(`Bazada ma'lumot bor (${books} kitob) — nusxa yuklanmadi.`);
      return;
    }
    throw new Error("Baza bo'sh emas. Nusxa faqat yangi bazaga yuklanadi.");
  }
  const d = JSON.parse(gunzipSync(readFileSync(FILE)).toString("utf8")) as Snapshot;
  // tartib muhim: avval bog'lanadiganlar
  /* eslint-disable @typescript-eslint/no-explicit-any */
  await prisma.$transaction(
    async (tx) => {
      await inChunks(d.authors as any[], (data) => tx.author.createMany({ data }));
      await inChunks(d.books as any[], (data) => tx.book.createMany({ data }));
      await inChunks(d.sellers as any[], (data) => tx.seller.createMany({ data }));
      await inChunks(d.editions as any[], (data) => tx.edition.createMany({ data }));
      await inChunks(d.offers as any[], (data) => tx.offer.createMany({ data }));
      await inChunks(d.snapshots as any[], (data) => tx.priceSnapshot.createMany({ data }));
      await inChunks(d.unmatched as any[], (data) => tx.unmatchedItem.createMany({ data }));
    },
    { timeout: 300_000, maxWait: 30_000 },
  );
  console.log(
    `Yuklandi (${d.exportedAt} holati): ${d.books.length} kitob, ${d.sellers.length} sotuvchi, ${d.offers.length} narx.`,
  );
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "export") return exportSnapshot();
  if (cmd === "load") return loadSnapshot(rest.includes("--if-empty"));
  console.error("Foydalanish: npm run snapshot -- export | load [--if-empty]");
  process.exitCode = 2;
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
