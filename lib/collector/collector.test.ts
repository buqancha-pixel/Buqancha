import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeIsbn } from "./isbn.ts";
import { parsePrice, checkPrice } from "./price.ts";
import { parseRobots } from "./robots.ts";
import { extractJsonLdItems } from "./parsers/jsonld.ts";
import { parseFeed, parseCsv } from "./parsers/feed.ts";
import { buildIndex, matchItem, cleanTitle, type IndexEdition } from "./match.ts";
import { decide } from "./decide.ts";
import { PoliteFetcher, BlockedByRobotsError } from "./fetcher.ts";

test("ISBN: tozalash, tekshirish, 10 → 13", () => {
  assert.equal(normalizeIsbn("978-0-306-40615-7"), "9780306406157");
  assert.equal(normalizeIsbn("ISBN 0-306-40615-2"), "9780306406157");
  assert.equal(normalizeIsbn("978-0-306-40615-8"), null);
  assert.equal(normalizeIsbn("abc"), null);
  assert.equal(normalizeIsbn(undefined), null);
});

test("narx matnini o'qish", () => {
  assert.equal(parsePrice("39 000 so'm"), 39000);
  assert.equal(parsePrice("39\u00a0000 сўм"), 39000);
  assert.equal(parsePrice("39,000"), 39000);
  assert.equal(parsePrice("39.000"), 39000);
  assert.equal(parsePrice("39000.00"), 39000);
  assert.equal(parsePrice("1.250.000,50 UZS"), 1250000);
  assert.equal(parsePrice(45000), 45000);
  assert.equal(parsePrice("bepul"), null);
  assert.equal(parsePrice(0), null);
});

test("narx tekshiruvi: oraliq va keskin o'zgarish", () => {
  assert.equal(checkPrice(500, null), "reject");
  assert.equal(checkPrice(50_000_000, null), "reject");
  assert.equal(checkPrice(40000, 39000), "ok");
  assert.equal(checkPrice(4000, 39000), "flag");
  assert.equal(checkPrice(90000, 39000), "flag");
});

test("robots.txt", () => {
  const r = parseRobots(
    `User-agent: *\nDisallow: /cart\nDisallow: /search\nAllow: /search/books$\nCrawl-delay: 5\n\nUser-agent: OtherBot\nDisallow: /`,
    "BuqanchaBot/1.0 (+https://buqancha.uz/bot)",
  );
  assert.equal(r.isAllowed("/product/123"), true);
  assert.equal(r.isAllowed("/cart/add"), false);
  assert.equal(r.isAllowed("/search?q=x"), false);
  assert.equal(r.isAllowed("/search/books"), true);
  assert.equal(r.crawlDelayMs, 5000);

  const own = parseRobots(`User-agent: *\nAllow: /\n\nUser-agent: buqanchabot\nDisallow: /p/*?\n`, "BuqanchaBot/1.0");
  assert.equal(own.isAllowed("/p/1?x=1"), false);
  assert.equal(own.isAllowed("/p/1"), true);

  assert.equal(parseRobots("", "BuqanchaBot").isAllowed("/any"), true);
  assert.equal(parseRobots("User-agent: *\nDisallow:", "BuqanchaBot").isAllowed("/any"), true);
});

test("JSON-LD: Product + AggregateOffer, @graph, buzuq bloklar, boshqa valyuta", () => {
  const html = readFileSync(new URL("./fixtures/product-page.html", import.meta.url), "utf8");
  const items = extractJsonLdItems(html, "https://dokon.example/p/otkan-kunlar");
  assert.equal(items.length, 1);
  const [it] = items;
  assert.equal(it.title, "Abdulla Qodiriy: O'tkan kunlar (qattiq muqova)");
  assert.equal(it.price, 41000);
  assert.equal(it.inStock, true);
  assert.equal(it.isbn, "9780306406157");
  assert.equal(it.author, "Abdulla Qodiriy");
  assert.equal(it.url, "https://dokon.example/p/otkan-kunlar");
  assert.equal(it.cover, "qattiq", "muqova nomdan aniqlanadi");
});

test("CSV feed: ; ajratkich, qo'shtirnoq, o'zbekcha sarlavhalar, xatolar", () => {
  const csv = [
    "\uFEFFISBN;Nom;Muallif;Narx;Mavjud;Havola",
    `978-0-306-40615-7;"O'tkan kunlar; qattiq muqova";Abdulla Qodiriy;39 000;ha;https://d.uz/1`,
    `;Shum bola;G'afur G'ulom;28000;yo'q;https://d.uz/2`,
    `;Narxsiz kitob;;;ha;`,
    `123;Xato ISBN;;30000;1;`,
  ].join("\r\n");
  const { items, errors } = parseFeed(csv);
  assert.equal(items.length, 3);
  assert.equal(items[0].title, "O'tkan kunlar; qattiq muqova");
  assert.equal(items[0].price, 39000);
  assert.equal(items[0].isbn, "9780306406157");
  assert.equal(items[1].inStock, false);
  assert.equal(items[1].key, "https://d.uz/2");
  assert.equal(errors.length, 2);
  assert.match(errors[0], /4-qator: narx/);
  assert.match(errors[1], /ISBN noto'g'ri/);
});

test("JSON feed", () => {
  const { items } = parseFeed(JSON.stringify({ items: [{ title: "Sarob", price: 33000, in_stock: false, sku: "A1" }] }));
  assert.deepEqual(items[0], { key: "A1", title: "Sarob", author: undefined, publisher: undefined, isbn: undefined, price: 33000, inStock: false, url: undefined });
});

test("parseCsv: qator ichida yangi qator", () => {
  assert.deepEqual(parseCsv(`a,b\n"x\ny",2\n`), [["a", "b"], ["x\ny", "2"]]);
});

const editions: IndexEdition[] = [
  { editionId: "e1", bookId: "b1", isbn: "9780306406157", publisher: "G'afur G'ulom nomidagi NMIU", title: "O'tkan kunlar", titleCyrl: "Ўткан кунлар", author: "Abdulla Qodiriy", authorCyrl: "Абдулла Қодирий" },
  { editionId: "e2", bookId: "b1", isbn: null, publisher: "Akademnashr", title: "O'tkan kunlar", titleCyrl: "Ўткан кунлар", author: "Abdulla Qodiriy", authorCyrl: null },
  { editionId: "e3", bookId: "b2", isbn: null, publisher: "Akademnashr", title: "Navoiy", titleCyrl: "Навоий", author: "Oybek", authorCyrl: "Ойбек" },
  { editionId: "e4", bookId: "b3", isbn: null, publisher: "Akademnashr", title: "Shum bola", titleCyrl: null, author: "G'afur G'ulom", authorCyrl: null },
];
const index = buildIndex(editions);
const item = (o: Partial<Parameters<typeof matchItem>[0]>) => ({ key: "k", title: "", price: 30000, inStock: true, ...o });

test("moslashtirish: ISBN, nom + muallif, nashriyot, noaniqlik", () => {
  assert.deepEqual(matchItem(item({ title: "nimadir", isbn: "0-306-40615-2" }), index), { editionId: "e1", bookId: "b1", by: "isbn" });
  // ikki nashr bor, nashriyot aytilmagan — kitob topiladi, nashr esa yo'q
  assert.deepEqual(matchItem(item({ title: "O'tkan kunlar", author: "A. Qodiriy" }), index), { editionId: null, bookId: "b1", reason: "nashr aniq emas (bir nechta nashr)" });
  assert.equal(matchItem(item({ title: "Ўткан кунлар", author: "Қодирий", publisher: "Akademnashr" }), index).editionId, "e2");
  // muallifsiz: nom aynan teng bo'lsa yoki muallif familiyasi nomda bo'lsa
  assert.equal(matchItem(item({ title: "Shum bola" }), index).editionId, "e4");
  assert.equal(matchItem(item({ title: "G'afur G'ulom — Shum bola" }), index).editionId, "e4");
  // "shovqin" so'zlar: roman, qattiq muqova
  assert.equal(matchItem(item({ title: "Navoiy romani (qattiq muqova)", author: "Oybek" }), index).editionId, "e3");
  // "Navoiy" so'zi bor, lekin boshqa kitob
  assert.equal(matchItem(item({ title: "Alisher Navoiy. Xamsa", author: "Alisher Navoiy" }), index).editionId, null);
  assert.equal(matchItem(item({ title: "Navoiy haqida esse" }), index).bookId, null);
  assert.equal(matchItem(item({ title: "Navoiy", author: "Oybek" }), index).editionId, "e3");
});

test("moslashtirish: qo'shimcha so'z, to'plam, boshqa til — boshqa mahsulot", () => {
  assert.equal(matchItem(item({ title: "Shum bola 2", author: "G'afur G'ulom" }), index).bookId, null);
  assert.equal(matchItem(item({ title: "Shum bola bolalar uchun", author: "G'afur G'ulom" }), index).bookId, null);
  // qavs ichidagi izoh — o'sha kitob
  assert.equal(matchItem(item({ title: "Shum bola (bolalar uchun)", author: "G'afur G'ulom" }), index).bookId, "b3");
  assert.match((matchItem(item({ title: "O'tkan kunlar 1-2-3 jild", author: "Qodiriy" }), index) as { reason: string }).reason, /to'plam/);
  assert.match((matchItem(item({ title: "O'tkan kunlar", author: "Qodiriy", language: "en" }), index) as { reason: string }).reason, /boshqa tilda/);
});

test("do'kon nomidagi qo'shimchalar: format, betlar, qavs", () => {
  assert.equal(cleanTitle("O'tkan kunlar (А5, qattiq) 400 bet"), "O'tkan kunlar");
  assert.equal(cleanTitle("Shaytanat (2-kitob)"), "Shaytanat 2-kitob");
  assert.equal(matchItem(item({ title: "Navoiy (A5, yumshoq) 424 bet", author: "Oybek" }), index).editionId, "e3");
  assert.equal(matchItem(item({ title: "Navoiy nazmi rangin", author: "Oybek" }), index).bookId, null);
  assert.equal(matchItem(item({ title: "Shum bola (2-kitob)", author: "G'afur G'ulom" }), index).bookId, null);
});

test("moslashtirish: yangi ISBN — yangi nashr yoki ISBN'siz nashrni to'ldirish", () => {
  // Qamar o'z nashri: kitob ma'lum, nashr yangi
  assert.deepEqual(
    matchItem(item({ title: "O'tkan kunlar ro'moni", author: "Abdulla Qodiriy", publisher: "Qamar", isbn: "9789910922725" }), index),
    { editionId: null, bookId: "b1", reason: "yangi nashr" },
  );
  // Akademnashr nashrining ISBN'i bazada yo'q edi — o'sha nashrga bog'lanadi
  assert.equal(matchItem(item({ title: "O'tkan kunlar", author: "Qodiriy", publisher: "Akademnashr", isbn: "9789910922725" }), index).editionId, "e2");
});

test("qaror: yaratish, yangilash, shubhali, namunaviyni almashtirish", () => {
  assert.equal(decide(null, { price: 39000, inStock: true }).action, "create");
  assert.equal(decide(null, { price: 10, inStock: true }).action, "reject");
  assert.equal(decide({ price: 39000, inStock: true, isSample: false }, { price: 39000, inStock: true }).action, "unchanged");
  assert.deepEqual(decide({ price: 39000, inStock: true, isSample: false }, { price: 41000, inStock: true }), { action: "update", priceChanged: true, stockChanged: false });
  assert.equal(decide({ price: 39000, inStock: true, isSample: false }, { price: 3900, inStock: true }).action, "flag");
  // namunaviy narx keskin farq qilsa ham almashtiriladi
  assert.equal(decide({ price: 39000, inStock: true, isSample: true }, { price: 99000, inStock: true }).action, "update");
});

test("yuklovchi: robots.txt, kutish, 429 da qayta urinish", async () => {
  const calls: string[] = [];
  const slept: number[] = [];
  let n = 0;
  const fake = (async (url: string) => {
    calls.push(String(url));
    if (String(url).endsWith("/robots.txt")) return new Response("User-agent: *\nDisallow: /private\nCrawl-delay: 2");
    if (String(url).endsWith("/busy") && n++ === 0) return new Response("", { status: 429, headers: { "retry-after": "7" } });
    return new Response("<html>ok</html>", { headers: { "content-type": "text/html" } });
  }) as typeof fetch;
  const f = new PoliteFetcher({ minDelayMs: 500, fetchImpl: fake, sleep: async (ms) => { slept.push(ms); } });

  await assert.rejects(f.get("https://d.example/private/x"), BlockedByRobotsError);
  assert.equal((await f.get("https://d.example/a")).body, "<html>ok</html>");
  await f.get("https://d.example/busy");
  assert.equal(calls.filter((c) => c.endsWith("robots.txt")).length, 1, "robots.txt keshlanadi");
  assert.ok(slept.includes(7000), "Retry-After hurmat qilinadi");
  assert.ok(slept.some((ms) => ms > 1000 && ms <= 2000), "Crawl-delay (2s) hurmat qilinadi");
});

test("yuklovchi: robots.txt 5xx bo'lsa hech narsa yuklanmaydi", async () => {
  const fake = (async () => new Response("", { status: 503 })) as unknown as typeof fetch;
  const f = new PoliteFetcher({ fetchImpl: fake, sleep: async () => {} });
  await assert.rejects(f.get("https://down.example/p"), /robots\.txt HTTP 503/);
  const offline = new PoliteFetcher({ fetchImpl: (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch, sleep: async () => {} });
  await assert.rejects(offline.get("https://off.example/p"), /robots\.txt ochilmadi/);
});
