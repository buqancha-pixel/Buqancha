import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTelegramChannel, telegramPosts } from "./telegram.ts";

const msg = (id: number, date: string, text: string) =>
  `<div class="tgme_widget_message_wrap js-widget_message_wrap"><div class="tgme_widget_message" data-post="asaxiybooks/${id}">` +
  `<div class="tgme_widget_message_text js-message_text" dir="auto">${text}</div>` +
  `<a class="tgme_widget_message_date" href="https://t.me/asaxiybooks/${id}"><time datetime="${date}" class="time">12:00</time></a></div></div>`;

const top = `TOP-5 kitob:<br/><a href="https://asaxiy.uz/product/zhorzh-oruell-molhona" target="_blank" onclick="return confirm('Open this link?\\n\\n'+this.href);"><b><i class="emoji" style="x"><b>1️⃣</b></i> Molxona</b></a><b> - 30 000 so‘m<br/><i class="emoji"><b>2️⃣</b></i> </b><a href="https://asaxiy.uz/product/diqqat?utm=tg"><b>Chalg‘ituvchi dunyoda muvaffaqiyat sirlari</b></a><b> - 42 000 so&#39;m<br/></b>`;
const single = `<i class="emoji"><b>🎬</b></i> &quot;<b>Rejissyor&quot; kitobi muallifi bilan suhbat&#33;</b><br/><br/><blockquote>Muqova: yumshoq<br/>Narxi: 58 700 so‘m</blockquote>`;
const quiz = `&quot;Birga yoziladimi yoki ajratib?&quot; kabi savollar.<br/>Orif Tolibning &quot;Ibratli imlo&quot; kitobi yordam beradi.<br/>Narxi: 69 000 so‘m`;
const named = `#sotuvda<br/><br/>Cho‘lpon ijodi haqida &quot;katta&quot; kitob.<br/><br/>Kitob nomi: Abdulhamid Choʻlpon<br/>Turkum: Jadid adabiyoti namoyandalari<br/>Muqova: qattiq<br/>Narxi: 60 000 soʻm<br/><br/>✍️ Xarid uchun: <a href="https://t.me/Sotuv_Zabarjad">@Sotuv_Zabarjad</a>`;
const top10 = `Haftaning TOP 10 kitobi<br/><br/>1. &quot;Gannibal&quot; — 56.000 soʻm;<br/>2. &quot;Soʻng&quot; — 45.000 soʻm;<br/>5. &quot;Sirli kitob qahramonlari&quot; — 12.000 soʻm (har biri);<br/><br/><a href="https://asaxiy.uz/">Website</a>`;
const plain = `IBooK’da yangiliklar<br/><br/>1. Qulogʻim senda qizim - 82.000 soʻm<br/>9. Oqsoch - 72.000 soʻm<br/><br/>Birgina harakat va “Oʻsmir” kitobi qoʻlingizda`;
const dotted = `Birgina harakat va “Oʻsmir” kitobi qoʻlingizda 😎<br/><br/>Narxi: 99.000 soʻm<br/>Muqovasi: qattiq`;
const noPrice = `Aziz kitobxonlar! Ovozli chat siz uchun manfaatli boʻldimi?`;
const old = `<a href="https://asaxiy.uz/product/eski">Eski kitob</a> - 10 000 so'm`;

const page = msg(1, "2026-11-04T09:00:00+00:00", top) + msg(2, "2026-11-03T09:00:00+00:00", single) + msg(3, "2026-11-02T09:00:00+00:00", noPrice) + msg(5, "2026-11-01T09:00:00+00:00", quiz) + msg(6, "2026-10-31T09:00:00+00:00", named) + msg(7, "2026-10-30T09:00:00+00:00", top10) + msg(8, "2026-10-29T09:00:00+00:00", plain) + msg(9, "2026-10-28T09:00:00+00:00", dotted) + msg(4, "2026-08-01T09:00:00+00:00", old);

test("Telegram kanal postlari", () => {
  assert.equal(telegramPosts(page).length, 9);
  const items = parseTelegramChannel(page, { channel: "asaxiybooks", sellerHost: "asaxiy.uz", now: new Date("2026-11-04T12:00:00Z") });
  const by = Object.fromEntries(items.map((i) => [i.title, i]));
  assert.equal(items.length, 11);
  assert.equal(by["Qulogʻim senda qizim"]?.price, 82000);
  assert.equal(by["Oqsoch"]?.price, 72000);
  assert.equal(by["Oʻsmir"]?.price, 99000);
  assert.equal(by["Gannibal"]?.price, 56000);
  assert.equal(by["Sirli kitob qahramonlari"]?.price, 12000);
  assert.equal(by["Gannibal"]?.url, "https://t.me/asaxiybooks/7#gannibal");
  assert.equal(new Set(items.map((i) => i.url)).size, items.length, "har bir narxning havolasi alohida");
  assert.equal(by["Abdulhamid Choʻlpon"]?.price, 60000);
  assert.equal(by["Abdulhamid Choʻlpon"]?.url, "https://t.me/asaxiybooks/6");
  assert.equal(by["Ibratli imlo"]?.price, 69000);
  assert.equal(by["Molxona"].price, 30000);
  assert.equal(by["Molxona"].url, "https://asaxiy.uz/product/zhorzh-oruell-molhona");
  assert.equal(by["Chalg‘ituvchi dunyoda muvaffaqiyat sirlari"].url, "https://asaxiy.uz/product/diqqat");
  assert.equal(by["Rejissyor"].price, 58700);
  assert.equal(by["Rejissyor"].url, "https://t.me/asaxiybooks/2");
  assert.ok(!by["Eski kitob"], "30 kundan eski post olinmaydi");
});
