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
  assert.equal(looksRussian("Мышление"), true);
  assert.equal(looksRussian("O'tkan kunlar"), false);
  assert.equal(looksRussian("Тонкое искусство пофигизма"), true);
  assert.equal(looksRussian("Сила Instagram. Простой путь к миллиону подписчиков"), true);
  assert.equal(looksRussian("13 причин почему"), true);
  assert.equal(looksRussian("Видеомаркетинг: стратегия, контент, производство"), true);
  // o'zbekcha kirill — ruscha emas
  assert.equal(looksRussian("Шум бола"), false);
  assert.equal(looksRussian("Алишер Навоий"), false);
  assert.equal(looksRussian("Меҳробдан чаён"), false);
  assert.equal(looksRussian("Кеча ва кундуз"), false);
  assert.equal(looksRussian("Дунёнинг ишлари"), false);
  assert.equal(looksRussian("Лев Толстой: Энг сара асарлари"), false);
  assert.equal(looksRussian("Хотиралар / Анна Достоевская"), false);
  assert.equal(looksRussian("Бурунги болалар: Сайланма И"), false);
  assert.equal(looksRussian("Кентервильское привидение"), true);
  assert.equal(looksRussian("Из"), false);
  assert.equal(looksRussian("Буюк мураббий с.а.в"), false);
  assert.equal(looksRussian("Мастер и Маргарита"), true);
  assert.equal(looksRussian("Американская трагедия - 1"), true);
});

test("katta/kichik harflarni tartiblash", () => {
  assert.equal(tidyCase("ABDULLA QODIRIY"), "Abdulla Qodiriy");
  assert.equal(tidyCase("abdulla qodiriy"), "Abdulla Qodiriy");
  assert.equal(tidyCase("Jeyms Klir"), "Jeyms Klir");
});
