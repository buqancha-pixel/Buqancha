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
  assert.equal(isReligiousText("Stress va din"), true);
  assert.equal(isReligiousText("Avliyolar kitobi"), true);
  assert.equal(isReligiousText("Dinozavrlar"), false);
  assert.equal(isReligiousText("Saodat asri qissalari: 1-kitob"), true);
  assert.equal(isReligiousText("Saxobalarning qizlari"), true);
  assert.equal(isReligiousText("Ilohiy nasihatlar"), true);
  assert.equal(isReligiousText("Payg‘ambarimizning hayoti"), true);
  assert.equal(isReligiousText("Yulduzli tunlar"), false);
  assert.equal(isReligiousText("Alpomish"), false);
  assert.equal(isReligiousText("Yo‘qotilgan Jannat"), false);
  assert.equal(isReligiousText("Dorur-rohat musulmonlari"), false);
  assert.equal(isReligiousText("Mo‘minjon Toshqin"), false);
  assert.equal(isReligiousText("Коран. Смысловой перевод"), true);
  assert.equal(isReligiousText("Мышление"), false);
  assert.equal(isReligiousText("Буюк мураббий с.а.в"), true);
  assert.equal(isReligiousText("Muhammad s.a.v. hayoti"), true);
  assert.equal(isReligiousText("Mo‘minlarning onalari"), true);
});
