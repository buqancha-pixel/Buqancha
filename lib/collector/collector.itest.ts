/**
 * Integratsiya testi: haqiqiy PostgreSQL (alohida test bazasi) bilan.
 *   npm run test:db
 * Har ishga tushishda baza seed qilinadi.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { prisma } from "../db";
import { importFeed, collectSeller, trackProductUrl } from "./run";

before(() => {
  if (!process.env.DATABASE_URL?.includes("_test")) throw new Error("Faqat test bazasida ishga tushiring (DATABASE_URL ..._test)");
  execSync("npx prisma migrate deploy && npx tsx prisma/seed.ts", { stdio: "ignore", env: process.env });
});
after(() => prisma.$disconnect());

const offerOf = async (seller: string, book: string) =>
  prisma.offer.findMany({
    where: { seller: { slug: seller }, edition: { book: { slug: book } } },
    include: { history: { orderBy: { recordedAt: "asc" } }, edition: true },
  });

test("hamkor feed'i: namunaviy narxlarni almashtiradi, moslanmaganlar navbatga tushadi", async () => {
  const before = await prisma.offer.count({ where: { seller: { slug: "topar" } } });
  assert.ok(before > 3);

  const csv = [
    "isbn,nom,muallif,nashriyot,narx,mavjud,havola",
    `,O'tkan kunlar,Abdulla Qodiriy,G'afur G'ulom nomidagi NMIU,47 000,ha,https://topar.uz/p/1`,
    `,"Кеча ва кундуз",Чўлпон,,50000,1,https://topar.uz/p/2`,
    `,Yangi chiqqan kitob,Noma'lum muallif,,30000,1,https://topar.uz/p/3`,
    `,Shum bola,G'afur G'ulom,,50,1,https://topar.uz/p/4`,
  ].join("\n");
  const r = await importFeed("topar", csv);

  assert.equal(r.status, "PARTIAL");
  assert.equal(r.stats.seen, 4);
  assert.equal(r.stats.updated, 2);
  assert.equal(r.stats.unmatched, 1);
  assert.equal(r.stats.rejected, 1);

  const [otkan] = await offerOf("topar", "otkan-kunlar");
  assert.equal(otkan.price, 47000);
  assert.equal(otkan.isSample, false);
  assert.equal(otkan.source, "PARTNER");
  assert.equal(otkan.url, "https://topar.uz/p/1");
  assert.equal(otkan.history.length, 1);

  // feed'da yo'q yoki narxi rad etilgan namunaviy takliflar o'chirildi
  const left = await prisma.offer.findMany({ where: { seller: { slug: "topar" } } });
  assert.equal(left.length, 2);
  assert.ok(left.every((o) => !o.isSample));

  const unmatched = await prisma.unmatchedItem.findMany();
  assert.equal(unmatched.length, 1);
  assert.equal(unmatched[0].title, "Yangi chiqqan kitob");

  const run = await prisma.collectorRun.findFirstOrThrow({ orderBy: { startedAt: "desc" } });
  assert.equal(run.status, "PARTIAL");
  assert.ok(run.finishedAt);
});

test("takroriy import: narx tarixi, ko'rinmaganlar 'mavjud emas', shubhali narx", async () => {
  let r = await importFeed("topar", `nom,muallif,narx\nKecha va kunduz,Cho'lpon,51000\n`);
  assert.equal(r.stats.updated, 1);
  assert.equal(r.stats.markedOut, 1);
  const [otkan] = await offerOf("topar", "otkan-kunlar");
  assert.equal(otkan.inStock, false);
  assert.equal(otkan.history.length, 2);

  r = await importFeed("topar", `nom,muallif,narx\nKecha va kunduz,Cho'lpon,5000\nO'tkan kunlar,Qodiriy,47000\n`);
  assert.equal(r.stats.flagged, 1);
  const [kecha] = await offerOf("topar", "kecha-va-kunduz");
  assert.equal(kecha.price, 51000, "shubhali narx avtomatik qo'llanmaydi");
  assert.equal(kecha.pendingPrice, 5000);
  // O'tkan kunlarning ikki nashri bor, nashriyot berilmagan — moslanmaydi, lekin
  // mavjud taklifni "ko'rmadi" — bitta real taklifdan bittasi = 50%, belgilanadi
  assert.equal(r.stats.unmatched, 1);
});

test("bo'sh feed hech narsani buzmaydi", async () => {
  const r = await importFeed("topar", `nom,narx\n`);
  assert.equal(r.stats.seen, 0);
  assert.equal(r.stats.markedOut, 0);
  const [kecha] = await offerOf("topar", "kecha-va-kunduz");
  assert.equal(kecha.inStock, true);
});

test("mahsulot sahifasi (JSON-LD): kuzatuvga qo'shish va qayta tekshirish", async () => {
  await prisma.seller.update({ where: { slug: "asaxiy" }, data: { collector: "PRODUCT_PAGE", crawlDelayMs: 0 } });
  let price = "36 500";
  const fake = (async (url: string) => {
    if (String(url).endsWith("/robots.txt")) return new Response("User-agent: *\nDisallow: /cart");
    return new Response(
      `<script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name: "Abdulla Qahhor — Sarob",
        offers: { "@type": "Offer", price, priceCurrency: "UZS", availability: "https://schema.org/InStock" },
      })}</script>`,
      { headers: { "content-type": "text/html" } },
    );
  }) as typeof fetch;
  const opts = { fetchImpl: fake, sleep: async () => {} };

  await assert.rejects(trackProductUrl("asaxiy", "https://boshqa-sayt.uz/p/1", opts), /tegishli emas/);

  let r = await trackProductUrl("asaxiy", "https://asaxiy.uz/product/sarob", opts);
  assert.equal(r.status, "SUCCESS");
  assert.equal(r.stats.updated, 1);
  let [o] = await offerOf("asaxiy", "sarob");
  assert.equal(o.price, 36500);
  assert.equal(o.source, "AUTO");
  assert.equal(o.isSample, false);

  price = "38000";
  r = await collectSeller("asaxiy", opts);
  assert.equal(r.status, "SUCCESS");
  assert.equal(r.stats.updated, 1);
  [o] = await offerOf("asaxiy", "sarob");
  assert.equal(o.price, 38000);
  assert.deepEqual(o.history.map((h) => h.price), [36500, 38000]);

  // boshqa (namunaviy) Asaxiy takliflariga tegilmaydi
  const samples = await prisma.offer.count({ where: { seller: { slug: "asaxiy" }, isSample: true } });
  assert.ok(samples > 5);
});

test("sitemap orqali topish: yangi nashr, to'plam navbatga, aloqasiz sahifa yuklanmaydi", async () => {
  await prisma.seller.update({
    where: { slug: "qamar" },
    data: { collector: "PRODUCT_PAGE", crawlDelayMs: 0, sitemapUrls: ["https://qamar.uz/sitemap.xml"] },
  });
  const fetched: string[] = [];
  const page = (name: string, isbn: string, price: number) =>
    `<script type="application/ld+json">${JSON.stringify({
      "@type": ["Product", "Book"], name, isbn, numberOfPages: 576, bookFormat: "https://schema.org/Hardcover",
      author: { "@type": "Person", name: "Abdulla Qodiriy" }, publisher: { "@type": "Organization", name: "Qamar" },
      offers: { "@type": "Offer", price, priceCurrency: "UZS", availability: "https://schema.org/InStock" },
    })}</script>`;
  const fake = (async (u: string) => {
    const url = String(u);
    fetched.push(url);
    if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /");
    if (url.endsWith("/sitemap.xml"))
      return new Response(
        `<urlset><url><loc>https://qamar.uz/kitob/otkan-kunlar-romoni</loc></url>` +
          `<url><loc>https://qamar.uz/kitob/otkan-kunlar-1-2-3-jild</loc></url>` +
          `<url><loc>https://qamar.uz/kitob/atom-odatlar</loc></url></urlset>`,
      );
    if (url.endsWith("otkan-kunlar-romoni")) return new Response(page("O'tkan kunlar ro'moni", "9789910922725", 50000));
    if (url.endsWith("1-2-3-jild")) return new Response(page("O'tkan kunlar: 1-2-3-jild", "9789910922732", 135000));
    return new Response("", { status: 404 });
  }) as typeof fetch;

  const r = await collectSeller("qamar", { fetchImpl: fake, sleep: async () => {} });
  assert.equal(r.status, "SUCCESS");
  assert.equal(r.stats.created, 1);
  assert.equal(r.stats.newEditions, 1);
  assert.equal(r.stats.unmatched, 1);
  assert.ok(!fetched.some((u) => u.includes("atom-odatlar")), "aloqasiz sahifa yuklanmaydi");

  const ed = await prisma.edition.findUniqueOrThrow({ where: { isbn: "9789910922725" }, include: { book: true, offers: true } });
  assert.equal(ed.book.slug, "otkan-kunlar");
  assert.equal(ed.publisher, "Qamar");
  assert.equal(ed.pages, 576);
  assert.equal(ed.cover, "qattiq");
  assert.equal(ed.offers[0].price, 50000);

  // ikkinchi marta: ko'rilgan sahifalar qayta "topilmaydi", taklif esa qayta tekshiriladi
  fetched.length = 0;
  const r2 = await collectSeller("qamar", { fetchImpl: fake, sleep: async () => {} });
  assert.equal(r2.stats.newEditions, 0);
  assert.equal(r2.stats.unchanged, 1);
  assert.equal(fetched.filter((u) => u.includes("1-2-3-jild")).length, 0);
});
