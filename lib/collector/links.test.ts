import { test } from "node:test";
import assert from "node:assert/strict";
import { extractLinks } from "./links.ts";

test("bo'lim sahifasidan mahsulot havolalari", () => {
  const html = `
    <a href="/products/nazar-eshonqul-maymun-yetaklagan-odam">1</a>
    <a href="/products/nazar-eshonqul-maymun-yetaklagan-odam#sharh">takror</a>
    <a href='https://kitobolami.uz/products/otkan-kunlar?ref=x&amp;y=1'>2</a>
    <a href="/categories/ozbek-adabiyoti?page=2">keyingi</a>
    <a href="https://boshqa.uz/products/x">boshqa sayt</a>`;
  const links = extractLinks(html, "https://kitobolami.uz/categories/ozbek-adabiyoti?page=1", /^https:\/\/kitobolami\.uz\/products\//);
  assert.deepEqual(links, [
    "https://kitobolami.uz/products/nazar-eshonqul-maymun-yetaklagan-odam",
    "https://kitobolami.uz/products/otkan-kunlar?ref=x&y=1",
  ]);
});
