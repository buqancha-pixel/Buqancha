/**
 * Ko'rsatish uchun o'zbek kirill → lotin (rasmiy imlo, o' / g' bilan).
 * Qidiruv uchun normalize.ts ishlatiladi; bu esa odam o'qiydigan matn uchun.
 */
const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y", к: "k",
  л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts",
  ч: "ch", ш: "sh", щ: "sh", ъ: "'", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
  ў: "o'", қ: "q", ғ: "g'", ҳ: "h",
};
const VOWELS = new Set("аеёиоуэюяў");

export function hasCyrillic(s: string): boolean {
  return /[Ѐ-ӿ]/.test(s);
}

export function toLatinDisplay(input: string): string {
  const chars = Array.from(input);
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const lower = ch.toLowerCase();
    if (!(lower in MAP)) {
      out += ch;
      continue;
    }
    let rep = MAP[lower];
    if (lower === "е") {
      const prev = chars[i - 1]?.toLowerCase();
      if (!prev || !/\p{L}/u.test(prev) || VOWELS.has(prev) || prev === "ъ" || prev === "ь") rep = "ye";
    }
    if (ch !== lower) {
      // Katta harf: "Ш" → "Sh", lekin butun so'z katta bo'lsa "SH"
      const next = chars[i + 1];
      const wordUpper = next && next !== next.toLowerCase();
      rep = wordUpper ? rep.toUpperCase() : rep.charAt(0).toUpperCase() + rep.slice(1);
    }
    out += rep;
  }
  return out;
}

/**
 * Ruscha (o'zbekcha emas) kirill matnmi? O'zbek kirilliga xos harflar (ў қ ғ ҳ) bo'lmasa va
 * ruschaga xos belgilar yoki ko'p uchraydigan ruscha so'zlar bo'lsa — ha.
 */
export function looksRussian(text: string): boolean {
  if (!hasCyrillic(text)) return false;
  if (/[ўқғҳЎҚҒҲ]/.test(text)) return false;
  if (/[ыщЫЩ]/.test(text)) return true;
  return /(^|[^а-яё])(и|в|на|для|как|что|это|от|по|не|из|книга|история|жизнь|мир|детей|человек|правила|секреты)([^а-яё]|$)/i.test(text);
}

/** "abdulla qodiriy" / "ABDULLA QODIRIY" → "Abdulla Qodiriy" (faqat butunlay kichik yoki katta bo'lsa). */
export function tidyCase(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t !== t.toLowerCase() && t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s\-("«'‘ʻ])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}
