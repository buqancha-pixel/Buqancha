import { test } from "node:test";
import assert from "node:assert/strict";
import { languageFromSellerCategories, mapSellerCategories, mapSellerCategory } from "./categories.ts";

test("sotuvchi bo'limlari → katalog", () => {
  assert.deepEqual(mapSellerCategory("jahon-adabiyoti"), ["jahon-adabiyoti"]);
  assert.deepEqual(mapSellerCategory("ozbek-adabiyoti"), ["ozbek-adabiyoti"]);
  assert.deepEqual(mapSellerCategory("jahon-bolalar-adabiyoti"), ["bolalar"]);
  assert.deepEqual(mapSellerCategory("bolalar-uchun-ertaklar"), ["bolalar"]);
  assert.deepEqual(mapSellerCategory("bola"), ["bolalar"]);
  assert.deepEqual(mapSellerCategory("psixologik"), ["psixologiya"]);
  assert.deepEqual(mapSellerCategory("detektiv-va-fantastik-asarlar"), ["detektiv-fantastika"]);
  assert.deepEqual(mapSellerCategory("ilm-fan-va-darsliklar").sort(), ["ilm-fan", "talim"]);
  assert.deepEqual(mapSellerCategory("siyosiy-va-huquqiy-adabiyotlar"), ["tarix"]);
  assert.deepEqual(mapSellerCategory("abiturientlar-uchun"), ["talim"]);
  assert.deepEqual(mapSellerCategory("rus-tilida"), []);
  assert.equal(languageFromSellerCategories(["jahon-adabiyoti", "rus-tilida"]), "ru");
  assert.equal(languageFromSellerCategories(["jahon-adabiyoti"]), null);
  assert.deepEqual(mapSellerCategory("ingliz-tili"), ["chet-tillari"]);
  assert.deepEqual(mapSellerCategory("ingliz-tilida"), []);
  // diniy, to'plam, sovg'a — olinmaydi
  assert.deepEqual(mapSellerCategory("diniy-marifiy-adabiyot"), []);
  assert.deepEqual(mapSellerCategory("quron-va-tafsirlar"), []);
  assert.deepEqual(mapSellerCategory("toplam-kitoblar"), []);
  assert.deepEqual(mapSellerCategory("badiiy-adabiyotlar"), []);
  assert.deepEqual(mapSellerCategories(["jahon-adabiyoti", "jahon-adabiyoti", "biznes"]), ["jahon-adabiyoti", "biznes"]);
});
