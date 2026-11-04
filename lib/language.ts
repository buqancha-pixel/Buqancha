const EN_WORDS = /\b(the|and|of|for|with|your|my|how|what|you|is|are|there|were|will|can|ielts|english|grammar|vocabulary|cambridge|oxford|stories|story|guide|world|life|love|book)\b/i;

/** Lotin yozuvidagi inglizcha nom: o'zbekcha belgilar (oʻ, gʻ) yo'q, kirill yo'q, inglizcha so'zlar bor. */
export function looksEnglish(title: string): boolean {
  if (/[а-яё]/i.test(title)) return false;
  if (/[oOgG][ʻ'‘’`]|ʻ/.test(title)) return false;
  return EN_WORDS.test(title);
}

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
    String.raw`yozuv\s+daftar`, String.raw`ёзув\s+дафтар`, String.raw`\bdaftar\s+\d+\s*varaq`, String.raw`тетрадь\s+\d+`, String.raw`\bkopirovka`,
    String.raw`\b\d{2,3}\s*[x×х]\s*\d{2,3}\s*mm\b`, String.raw`\bNo\.\s*[A-Za-z]{1,4}[_-]?\d`, String.raw`\b[A-Z]{2,4}-\d{3,}\b`,
  ].join("|"),
  "i",
);

export function looksNonBook(title: string): boolean {
  return NON_BOOK.test(title);
}

/** Do'kon seriya kodi prefiksi: "РК: Собачье сердце", "TO'M: Nyuton" → nomning o'zi. */
export function stripSeriesPrefix(title: string): string {
  return title.replace(/^\s*[A-ZА-ЯЁ][A-ZА-ЯЁ'ʻ‘’]{1,4}\s*:\s+/, "").trim();
}
