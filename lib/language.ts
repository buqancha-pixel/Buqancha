const EN_WORDS = /\b(the|and|of|for|with|your|my|how|what|you|is|are|there|were|will|can|ielts|english|grammar|vocabulary|cambridge|oxford|stories|story|guide|world|life|love|book)\b/i;

/** Lotin yozuvidagi inglizcha nom: o'zbekcha belgilar (oʻ, gʻ) yo'q, kirill yo'q, inglizcha so'zlar bor. */
export function looksEnglish(title: string): boolean {
  if (/[а-яё]/i.test(title)) return false;
  if (/[oOgG][ʻ'‘’`]|ʻ/.test(title)) return false;
  return EN_WORDS.test(title);
}
