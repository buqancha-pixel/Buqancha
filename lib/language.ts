const EN_WORDS = /\b(the|and|of|for|with|your|my|how|what|you|is|are|there|were|will|can|ielts|english|grammar|vocabulary|cambridge|oxford|stories|story|guide|world|life|love|book)\b/i;

/** Lotin yozuvidagi inglizcha nom: o'zbekcha belgilar (oʻ, gʻ) yo'q, kirill yo'q, inglizcha so'zlar bor. */
export function looksEnglish(title: string): boolean {
  if (/[а-яё]/i.test(title)) return false;
  if (/[oOgG][ʻ'‘’`]|ʻ/.test(title)) return false;
  // o'zbek lotin alifbosida "w", "th" va yolg'iz "c" yo'q — ular inglizcha nomga xos (Curtain, Robinson Crusoe)
  return EN_WORDS.test(title) || /w|th|c(?!h)/i.test(title.replace(/\b[A-Z][a-z]+\s*:/g, ""));
}

/** Muallifi ko'rsatilmagan kitoblar uchun umumiy "muallif" — saytda havolasiz va sitemap'siz ko'rsatiladi. */
export const UNKNOWN_AUTHOR = "Muallif ko'rsatilmagan";

/**
 * Kitob emas (kanselyariya, o'yinchoq, o'yin): sotuvchilar katalogida kitoblar bilan aralash keladi.
 * "Ish daftari", "mashqlar daftari" — kitob hisoblanadi; "yozuv daftari", "daftar 48 varaq" — yo'q.
 */
const NON_BOOK = new RegExp(
  [
    String.raw`\bpuzzle`, String.raw`\bpazl`, String.raw`\bmarker`, String.raw`\bmagnit`, String.raw`\bmagnetic`, String.raw`\btangram`,
    String.raw`\bruchka`, String.raw`\bqalamdon`, String.raw`\bflomaster`, String.raw`\bkley\b`, String.raw`\bstiker`, String.raw`\bsticker`,
    String.raw`\bbloknot`, String.raw`\bglobus`, String.raw`\bkonstruktor`, String.raw`\bo['ʻ‘’]yinchoq`, String.raw`\bkanselyar`,
    String.raw`\bkartochka`, String.raw`\bkarta\s+o['ʻ‘’]yin`, String.raw`\bstol\s+o['ʻ‘’]yin`, String.raw`\bboard\s+game`,
    String.raw`yozuv\s+daftar`, String.raw`ёзув\s+дафтар`, String.raw`\bdaftar\s+\d+\s*varaq`, String.raw`тетрадь\s+\d+\s*(?:лист|л\b)`, String.raw`\bkopirovka`,
    String.raw`\bNo\.\s*[A-Za-z]{0,4}[_-]?\d`, String.raw`\b[A-Z]{2,4}-\d{3,}\b`, String.raw`\bskripka\b`,
    String.raw`\blego\b`, String.raw`\btermos\b`, String.raw`sticky\s+notes`, String.raw`\bo['ʻ‘’]chirg['ʻ‘’]ich`, String.raw`\bsiyoh\b`, String.raw`\bkubik`,
    String.raw`\brubik`, String.raw`\bukazka\b`, String.raw`\bbookmark\b`, String.raw`\babakus\b`, String.raw`\bplanshet\b`, String.raw`\bm[ao]zayka`,
    String.raw`\bpet\s+stick`, String.raw`\bventilyator`, String.raw`\bmantiqiy\s+o['ʻ‘’]yin`, String.raw`\byog['ʻ‘’]ochli\s+(?:mashina|o['ʻ‘’]yin)`,
  ].join("|"),
  "i",
);

export function looksNonBook(title: string): boolean {
  // nomida "kitob"/"книга" bo'lsa — kitob (masalan "Magnitli kitob")
  if (/kitob|книга|книжка/i.test(title)) return false;
  return NON_BOOK.test(title);
}

/** Do'kon seriya kodi prefiksi: "РК: Собачье сердце", "TO'M: Nyuton" → nomning o'zi. */
export function stripSeriesPrefix(title: string): string {
  return title.replace(/^\s*[A-ZА-ЯЁ][A-ZА-ЯЁ'ʻ‘’]{1,4}\s*:\s+/, "").trim();
}
