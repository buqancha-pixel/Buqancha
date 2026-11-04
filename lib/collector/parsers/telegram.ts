import type { CollectedItem } from "../types.ts";

/**
 * Sotuvchining ochiq Telegram kanali (t.me/s/<kanal> — Telegram'ning ochiq veb-ko'rinishi) postlaridan narxlar.
 * Sotuvchi o'zi e'lon qilgan narxlar olinadi:
 *   1) ro'yxat qatorlari: «<havola>Kitob nomi</havola> - 30 000 so'm» (TOP-5 kabi postlar);
 *   2) bitta kitob posti: «"Kitob nomi" kitobi ... Narxi: 58 700 so'm» yoki «Kitob nomi: X … Narxi: N so'm».
 * Eski postlar (maxAgeDays dan oshgan) olinmaydi — aksiya narxlari eskirib qoladi.
 */
export type TelegramPost = { id: string; date: Date; html: string };

export function telegramPosts(page: string): TelegramPost[] {
  const out: TelegramPost[] = [];
  const blocks = page.split('<div class="tgme_widget_message_wrap').slice(1);
  for (const b of blocks) {
    const id = b.match(/data-post="([^"]+)"/)?.[1];
    const date = b.match(/<time[^>]*datetime="([^"]+)"/)?.[1];
    const text = b.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1];
    if (id && date && text) out.push({ id, date: new Date(date), html: text });
  }
  return out;
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", "#33": "!", nbsp: " " };
const unescape = (s: string) => s.replace(/&(#?\w+);/g, (m, e) => ENT[e] ?? (e.startsWith("#") ? String.fromCodePoint(Number(e.slice(1))) : m));

/** Post matni: emoji olib tashlanadi, havolalar ⟦url|matn⟧ belgisiga aylanadi, qatorlar saqlanadi. */
function postText(html: string): string {
  return unescape(
    html
      .replace(/<i class="emoji"[^>]*>[\s\S]*?<\/i>/g, "")
      .replace(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_, href, inner) => `⟦${href}|${inner.replace(/<[^>]+>/g, "")}⟧`)
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<\/?(blockquote|p)[^>]*>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  );
}

function price(raw: string): number | null {
  const n = Number(raw.replace(/[\s .,]/g, ""));
  return Number.isInteger(n) && n >= 3_000 && n <= 3_000_000 ? n : null;
}

const SOM = String.raw`so[‘'ʻ’\`]?m`;
const LIST_LINE = new RegExp(String.raw`⟦([^|⟧]+)\|([^⟧]+)⟧\s*[-–—:]\s*([\d][\d\s .,]{2,10})\s*${SOM}`, "gi");
const NARX = new RegExp(String.raw`Narx(?:i)?\s*:?\s*([\d][\d\s .,]{2,10})(?:\s*${SOM})?`, "gi");
// nom — qo'shtirnoqdagi va ortidan "kitob" so'zi keladigan qism («"Ibratli imlo" kitobi»), oddiy iqtibos emas
// havolasiz raqamli ro'yxat: «1. "Gannibal" — 56.000 soʻm;»
const QUOTED_LINE = new RegExp(String.raw`^\s*\d{1,2}[.)]\s*[«"“„]([^«»"“”„\n]{2,100})[»"”]\s*[-–—:]\s*([\d][\d\s\u00a0.,]{2,10})\s*${SOM}`, "gim");
// tirnoqsiz raqamli ro'yxat: «1. Qulogʻim senda qizim - 82.000 soʻm»
const PLAIN_LINE = new RegExp(String.raw`^\s*\d{1,2}[.)]\s*([^\n«"“”»]{2,100}?)\s+[-–—]\s+([\d][\d\s\u00a0.,]{2,10})\s*${SOM}`, "gim");
const NAMED = /(?:Kitob|Asar)\s+nomi\s*:\s*([^\n]{2,140})/i;
const QUOTED = /[«"“„]([^«»"“”„\n]{2,80})[»"”]\s*(?:nomli\s+)?kitob/i;

/** Sotuvchi saytidagi aniq sahifa havolasi (bosh sahifa yoki boshqa sayt emas). */
function productUrl(href: string, host?: string): string | undefined {
  try {
    const u = new URL(href);
    if (host && !u.hostname.replace(/^www\./, "").endsWith(host)) return undefined;
    if (!host && u.hostname === "t.me") return undefined;
    if (u.pathname.replace(/\/+$/, "").length < 2) return undefined;
    return `${u.origin}${u.pathname}`;
  } catch {
    return undefined;
  }
}

export function parseTelegramChannel(page: string, opts: { channel: string; sellerHost?: string; now?: Date; maxAgeDays?: number }): CollectedItem[] {
  const now = opts.now ?? new Date();
  const minDate = now.getTime() - (opts.maxAgeDays ?? 30) * 864e5;
  const host = opts.sellerHost;
  const items = new Map<string, CollectedItem>();
  const add = (it: CollectedItem) => {
    const prev = items.get(it.key);
    if (!prev) items.set(it.key, it); // postlar yangisidan eskisiga — birinchi uchragani eng yangisi
  };
  // yangi postlar birinchi
  for (const post of telegramPosts(page).sort((a, b) => b.date.getTime() - a.date.getTime())) {
    if (post.date.getTime() < minDate) continue;
    const text = postText(post.html);
    let found = 0;
    for (const m of text.matchAll(LIST_LINE)) {
      const [, href, rawTitle, rawPrice] = m;
      const p = price(rawPrice);
      const title = rawTitle.replace(/^\s*\d+[.)]?\s*/, "").trim();
      if (!p || title.length < 2) continue;
      const url = productUrl(href, host);
      add({ key: url ?? `tg:${opts.channel}:${title.toLowerCase()}`, title, price: p, inStock: true, url });
      found++;
    }
    const lines = text.replace(/⟦[^|]+\|([^⟧]*)⟧/g, "$1");
    for (const m of [...lines.matchAll(QUOTED_LINE), ...lines.matchAll(PLAIN_LINE)]) {
      const p = price(m[2]);
      const title = m[1].trim();
      if (!p || title.length < 2) continue;
      // bitta postda bir nechta kitob: havola har biri uchun alohida (yig'uvchi narxni havola bo'yicha taniydi)
      const url = `https://t.me/${post.id}#${encodeURIComponent(title.toLowerCase().replace(/\s+/g, "-").slice(0, 60))}`;
      add({ key: url, title, price: p, inStock: true, url });
      found++;
    }
    if (found) continue;
    // bitta kitob posti: aniq bitta narx va qo'shtirnoqdagi nom
    const prices = [...text.matchAll(NARX)].map((m) => price(m[1])).filter((x): x is number => !!x);
    const plain = text.replace(/⟦[^|]+\|([^⟧]*)⟧/g, "$1");
    // "Kitob nomi: X" qatori (nashriyot postlari) yoki «"X" kitobi»
    const title = (plain.match(NAMED)?.[1] ?? plain.match(QUOTED)?.[1])?.replace(/\s+/g, " ").trim();
    if (prices.length !== 1 || !title) continue;
    // sotuvchi saytidagi kitob sahifasi bo'lsa — o'sha, aks holda postning o'zi (heshteg va kontakt havolalari emas)
    const href = host ? [...text.matchAll(/⟦(https?:\/\/[^|⟧]+)\|/g)].map((m) => productUrl(m[1], host)).find(Boolean) : undefined;
    const url = href || `https://t.me/${post.id}`;
    add({ key: url, title, price: prices[0], inStock: true, url });
  }
  return [...items.values()];
}
