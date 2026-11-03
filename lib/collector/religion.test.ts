import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCategories, isReligious, isReligiousText } from "./religion.ts";

test("kategoriya: Qamar va Barakot", () => {
  assert.deepEqual(extractCategories(`"item":"https://qamar.uz/katalog/diniy-marifiy-adabiyot"`), ["diniy-marifiy-adabiyot"]);
  assert.deepEqual(extractCategories(`\\"href\\":\\"/catalog/ozbek-adabiyoti?itemType=book\\"`), ["ozbek-adabiyoti"]);
  assert.equal(isReligious({ title: "Bir kitob", categories: ["diniy-marifiy-adabiyot"] }), true);
  assert.equal(isReligious({ title: "Bir kitob", categories: ["quron"] }), true);
  assert.equal(isReligious({ title: "O'tkan kunlar", categories: ["ozbek-adabiyoti"] }), false);
});

test("nom va nashriyot bo'yicha", () => {
  assert.equal(isReligiousText("Hadis va Hayot 7-juz"), true);
  assert.equal(isReligiousText("Расулуллоҳ нинг ахли аёллари"), true);
  assert.equal(isReligiousText("Sog'lom bola", "Hilolnashr"), true);
  assert.equal(isReligiousText("Iymonning 77 xislati"), true);
  assert.equal(isReligiousText("O'tkan kunlar", "Yoshlar matbuoti"), false);
  assert.equal(isReligiousText("Kapitan Grant bolalari"), false);
  assert.equal(isReligiousText("Navoiy"), false);
});
