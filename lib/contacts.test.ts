import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeInstagram, normalizePhone, normalizeTelegram, sellerContacts } from "./contacts.ts";

test("telefon raqamlari", () => {
  assert.equal(normalizePhone("+998 90 123-45-67"), "+998901234567");
  assert.equal(normalizePhone("90 1234567"), "+998901234567");
  assert.equal(normalizePhone(""), null);
  assert.throws(() => normalizePhone("12345"));
});

test("Telegram va Instagram username", () => {
  assert.equal(normalizeTelegram("https://t.me/kitob_dokon"), "kitob_dokon");
  assert.equal(normalizeTelegram("@kitob_dokon"), "kitob_dokon");
  assert.throws(() => normalizeTelegram("@ab"));
  assert.equal(normalizeInstagram("instagram.com/kitob.uz/"), "kitob.uz");
  assert.equal(normalizeInstagram("@kitob.uz"), "kitob.uz");
});

test("aloqalar tartibi", () => {
  const c = sellerContacts({ phone: "+998901234567", telegram: "dokon", instagram: null, website: null });
  assert.deepEqual(c.map((x) => x.kind), ["telegram", "phone"]);
  assert.equal(c[1].href, "tel:+998901234567");
});
