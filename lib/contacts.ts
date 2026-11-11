/**
 * Sotuvchi aloqalari: do'kon kabinetida o'zi kiritadi (telefon, Telegram, Instagram, sayt).
 * Sayti yo'q onlayn do'konlarda xaridor shular orqali buyurtma beradi.
 */
export class ContactError extends Error {}

/** "+998 90 123-45-67", "90 1234567", "998901234567" → "+998901234567" */
export function normalizePhone(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  let d = t.replace(/\D/g, "");
  if (d.length === 9) d = `998${d}`;
  if (!/^998\d{9}$/.test(d)) throw new ContactError("Telefon raqami noto'g'ri. Masalan: +998 90 123 45 67");
  return `+${d}`;
}

export function formatPhone(p: string): string {
  const d = p.replace(/\D/g, "");
  return d.length === 12 ? `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}` : p;
}

/** "@dokon", "t.me/dokon", "https://t.me/dokon" → "dokon" */
export function normalizeTelegram(raw: string): string | null {
  const t = raw.trim().replace(/^https?:\/\//i, "").replace(/^(www\.)?(t\.me|telegram\.me)\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "");
  if (!t) return null;
  if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(t)) throw new ContactError("Telegram username noto'g'ri. Masalan: @kitob_dokonim");
  return t;
}

/** "@dokon", "instagram.com/dokon" → "dokon" */
export function normalizeInstagram(raw: string): string | null {
  const t = raw.trim().replace(/^https?:\/\//i, "").replace(/^(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "");
  if (!t) return null;
  if (!/^[A-Za-z0-9._]{1,30}$/.test(t)) throw new ContactError("Instagram username noto'g'ri. Masalan: @kitob_dokonim");
  return t;
}

export type Contact = { kind: "telegram" | "phone" | "instagram" | "website" | "social"; label: string; href: string };

type ContactFields = { phone?: string | null; telegram?: string | null; instagram?: string | null; website?: string | null; social?: string | null };

/** Buyurtma berish yo'llari (Telegram va telefon birinchi — onlayn do'konlarda asosiysi). */
export function sellerContacts(s: ContactFields): Contact[] {
  const out: Contact[] = [];
  if (s.telegram) out.push({ kind: "telegram", label: `Telegram: @${s.telegram}`, href: `https://t.me/${s.telegram}` });
  if (s.phone) out.push({ kind: "phone", label: `Qo'ng'iroq: ${formatPhone(s.phone)}`, href: `tel:${s.phone}` });
  if (s.instagram) out.push({ kind: "instagram", label: `Instagram: @${s.instagram}`, href: `https://www.instagram.com/${s.instagram}/` });
  if (s.website) out.push({ kind: "website", label: `Sayt: ${s.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}`, href: s.website });
  if (!s.telegram && !s.instagram && s.social) {
    const t = s.social.trim();
    const ig = t.match(/instagram\.com\/([\w.]+)/i);
    const tg = t.match(/(?:t\.me\/|^@)([\w]{4,})/i);
    if (ig) out.push({ kind: "instagram", label: `Instagram: @${ig[1]}`, href: `https://www.instagram.com/${ig[1]}/` });
    else if (tg) out.push({ kind: "telegram", label: `Telegram: @${tg[1]}`, href: `https://t.me/${tg[1]}` });
  }
  return out;
}

/** YouTube kanali: "@kanal", "youtube.com/@kanal", "youtube.com/channel/UC…" → to'liq https havola */
export function normalizeYoutube(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^@[\w.-]{3,30}$/.test(t)) return `https://www.youtube.com/${t}`;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    throw new ContactError("YouTube havolasi noto'g'ri. Masalan: https://www.youtube.com/@kanalim");
  }
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  if (host !== "youtube.com" && host !== "youtu.be") throw new ContactError("Bu YouTube havolasi emas. Masalan: https://www.youtube.com/@kanalim");
  if (!/^\/(@[\w.-]{3,30}|channel\/[\w-]{10,40}|c\/[\w.-]{2,60}|user\/[\w.-]{2,60})\/?$/.test(u.pathname))
    throw new ContactError("YouTube kanal havolasini kiriting (video emas). Masalan: https://www.youtube.com/@kanalim");
  return `https://www.youtube.com${u.pathname.replace(/\/$/, "")}`;
}
