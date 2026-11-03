import { test } from "node:test";
import assert from "node:assert/strict";
import { toLatinDisplay, looksRussian, tidyCase } from "./translit.ts";

test("kirill → lotin (ko'rsatish)", () => {
  assert.equal(toLatinDisplay("Ўткан кунлар"), "O'tkan kunlar");
  assert.equal(toLatinDisplay("Ғафур Ғулом"), "G'afur G'ulom");
  assert.equal(toLatinDisplay("Шайтанат"), "Shaytanat");
  assert.equal(toLatinDisplay("Ер юзи"), "Yer yuzi");
  assert.equal(toLatinDisplay("ЧЎЛПОН"), "CHO'LPON");
  assert.equal(toLatinDisplay("Abdulla Qodiriy"), "Abdulla Qodiriy");
});

test("ruscha matnni aniqlash", () => {
  assert.equal(looksRussian("Кеча ва кундуз"), false);
  assert.equal(looksRussian("Ўткан кунлар"), false);
  assert.equal(looksRussian("Сила привычки"), true);
  assert.equal(looksRussian("Мастер и Маргарита"), true);
  assert.equal(looksRussian("Мы"), true);
  assert.equal(looksRussian("O'tkan kunlar"), false);
});

test("katta/kichik harflarni tartiblash", () => {
  assert.equal(tidyCase("ABDULLA QODIRIY"), "Abdulla Qodiriy");
  assert.equal(tidyCase("abdulla qodiriy"), "Abdulla Qodiriy");
  assert.equal(tidyCase("Jeyms Klir"), "Jeyms Klir");
});
