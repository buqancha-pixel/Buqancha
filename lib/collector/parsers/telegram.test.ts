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
const noPrice = `Aziz kitobxonlar! Ovozli chat siz uchun manfaatli boʻldimi?`;
const old = `<a href="https://asaxiy.uz/product/eski">Eski kitob</a> - 10 000 so'm`;

const page = msg(1, "2026-11-04T09:00:00+00:00", top) + msg(2, "2026-11-03T09:00:00+00:00", single) + msg(3, "2026-11-02T09:00:00+00:00", noPrice) + msg(5, "2026-11-01T09:00:00+00:00", quiz) + msg(4, "2026-08-01T09:00:00+00:00", old);

test("Telegram kanal postlari", () => {
  assert.equal(telegramPosts(page).length, 5);
  const items = parseTelegramChannel(page, { channel: "asaxiybooks", sellerHost: "asaxiy.uz", now: new Date("2026-11-04T12:00:00Z") });
  const by = Object.fromEntries(items.map((i) => [i.title, i]));
  assert.equal(items.length, 4);
  assert.equal(by["Ibratli imlo"]?.price, 69000);
  assert.equal(by["Molxona"].price, 30000);
  assert.equal(by["Molxona"].url, "https://asaxiy.uz/product/zhorzh-oruell-molhona");
  assert.equal(by["Chalg‘ituvchi dunyoda muvaffaqiyat sirlari"].url, "https://asaxiy.uz/product/diqqat");
  assert.equal(by["Rejissyor"].price, 58700);
  assert.equal(by["Rejissyor"].url, "https://t.me/asaxiybooks/2");
  assert.ok(!by["Eski kitob"], "30 kundan eski post olinmaydi");
});
