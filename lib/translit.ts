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
  // o'zbekcha so'zlar/qo'shimchalar bo'lsa — o'zbekcha (ruscha ism bo'lsa ham: "Лев Толстой: Энг сара асарлари")
  if (/(^|[^а-яё])(ва|энг|билан|учун|ҳақида|хакида|сайланма)([^а-яё]|$)|[а-яё]{2,}(лар|лари|ларнинг|нинг|ларга|лардан)([^а-яё]|$)/i.test(text))
    return false;
  if (/[ыщЫЩ]/.test(text)) return true;
  // bitta so'zli nom ("Из" — o'zbekcha "Iz" ham bo'lishi mumkin) bog'lovchi bo'yicha aniqlanmaydi
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words < 2) return /[а-яё]{2,}(ство|ение|ание|ость|ться)$/i.test(text.trim());
  // bir harfli bog'lovchilar faqat kichik harfda ("Мастер и Маргарита"); "Сайланма И" — rim raqami
  if (/(^|\s)(и|в|к|с|у)(\s|$)/.test(text)) return true;
  if (/(^|[^а-яё])(на|для|как|что|это|от|по|не|из|за|при|без|почему|зачем|книга|история|жизнь|мир|детей|человек|правила|секреты)([^а-яё]|$)/i.test(text))
    return true;
  // o'zbek tilida bo'lmaydigan ruscha qo'shimchalar: искусство, мышление, сознание, учиться, простой
  return /[а-яё]{2,}(ство|ение|ание|ость|ться|ский|ская|ское|ские|ный|ная|ное|ные|ой|ое|ый|ая)([^а-яё]|$)/i.test(text);
}

/** "abdulla qodiriy" / "ABDULLA QODIRIY" → "Abdulla Qodiriy" (faqat butunlay kichik yoki katta bo'lsa). */
export function tidyCase(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t !== t.toLowerCase() && t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s\-("«'‘ʻ])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}
