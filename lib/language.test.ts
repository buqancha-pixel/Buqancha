import { test } from "node:test";
import assert from "node:assert/strict";
import { looksEnglish, looksNonBook, stripSeriesPrefix } from "./language.ts";

test("inglizcha nomni aniqlash", () => {
  assert.equal(looksEnglish("Get Ready for IELTS listening"), true);
  assert.equal(looksEnglish("And then there were none"), true);
  assert.equal(looksEnglish("O'tkan kunlar"), false);
  assert.equal(looksEnglish("Dunyoning ishlari"), false);
  assert.equal(looksEnglish("Самурай без меча"), false);
  assert.equal(looksEnglish("Curtain"), true);
  assert.equal(looksEnglish("Robinson Crusoe"), true);
  assert.equal(looksEnglish("Ikki eshik orasi"), false);
  assert.equal(looksEnglish("Shum bola"), false);
});

test("kitob bo'lmagan mahsulotlar", () => {
  for (const t of ["Puzzle games 6 pattern", "Marker SY-709-9", "Magnit No.ChB_531161 (Cheburashka)", "Magnetic tangram 3+", "Skripka 197x260 mm 4-6 yosh (Umka)", "Ҳуснихат (Ёзув дафтари) (А4, yupqa) 64 bet", "Arab alifbo kartochkasi", "Bloknot D-C1605-01", "Lego No.33045-4", "Termos M-620 / 500ml", "O'chirg'ich mix", "Mozayka taxtasi (shaklli)", "Sticky notes B5 qora"])
    assert.equal(looksNonBook(t), true, t);
  for (const t of ["Ko'rlik", "Matematika testlar to'plami", "Ingliz tili ish daftari", "Ахмоқлик қилманг", "2027 Kimyo MEGA testlar to'plami", "История Узбекистана рабочая тетрадь 8 класс", "Inson tanasi 200x175 mm (Umka)", "Magnitli kitob 200x200 (Umka)"])
    assert.equal(looksNonBook(t), false, t);
  assert.equal(stripSeriesPrefix("РК: Собачье сердце"), "Собачье сердце");
  assert.equal(stripSeriesPrefix("TO'M: Mashhur olimlar - Nyuton"), "Mashhur olimlar - Nyuton");
  assert.equal(stripSeriesPrefix("Ajdar ning tavbasi"), "Ajdar ning tavbasi");
});
