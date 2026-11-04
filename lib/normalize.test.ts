import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, searchKey, slugify, cyrillicToLatin } from "./normalize.ts";

test("O'tkan kunlar — barcha yozuv variantlari bir xil", () => {
  const variants = [
    "otkan kunlar",
    "O'tkan kunlar",
    "O‘tkan kunlar",
    "Oʻtkan kunlar",
    "O’tkan  kunlar",
    "Ötkan kunlar",
    "Ўткан кунлар",
    "ЎТКАН КУНЛАР",
  ];
  for (const v of variants) assert.equal(normalize(v), "otkan kunlar", v);
});

test("g', sh, ch va ularning ğ, ş, ç variantlari", () => {
  assert.equal(normalize("G'afur G'ulom"), "gafur gulom");
  assert.equal(normalize("Ğafur Ğulom"), "gafur gulom");
  assert.equal(normalize("Ғафур Ғулом"), "gafur gulom");
  assert.equal(normalize("Shum bola"), normalize("Şum bola"));
  assert.equal(normalize("Шум бола"), "shum bola");
  assert.equal(normalize("Chinor"), normalize("Çinor"));
  assert.equal(normalize("Чинор"), "chinor");
});

test("kirill: е so'z boshida ye bo'ladi", () => {
  assert.equal(cyrillicToLatin("ер"), "yer");
  assert.equal(cyrillicToLatin("келди"), "keldi");
});

test("searchKey: x/h, q/k, ikkilangan harflar", () => {
  assert.equal(searchKey("Abdulla Qodiriy"), searchKey("abdula kodiriy"));
  assert.equal(searchKey("Хамса"), searchKey("Hamsa"));
});

test("slugify", () => {
  assert.equal(slugify("O'tkan kunlar"), "otkan-kunlar");
  assert.equal(slugify("Sariq devni minib"), "sariq-devni-minib");
});
