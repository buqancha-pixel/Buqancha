/**
 * Bloger videolari: video saytga yuklanmaydi — YouTube, Instagram yoki TikTok'dagi videoning havolasi
 * olinadi va o'sha platformaning o'z pleyeri (iframe) bilan ko'rsatiladi.
 */
export type VideoRef = { platform: "youtube" | "instagram" | "tiktok"; id: string; url: string };

export class VideoLinkError extends Error {}

export function parseVideoUrl(raw: string): VideoRef {
  const t = raw.trim();
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    throw new VideoLinkError("Video havolasi noto'g'ri. YouTube, Instagram yoki TikTok'dagi video havolasini qo'ying.");
  }
  const host = u.hostname.replace(/^(www\.|m\.)/, "").toLowerCase();
  const path = u.pathname.replace(/\/+$/, "");
  if (host === "youtube.com" || host === "youtu.be" || host === "music.youtube.com") {
    const id =
      host === "youtu.be" ? path.slice(1) : u.searchParams.get("v") ?? path.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1] ?? "";
    if (!/^[\w-]{11}$/.test(id)) throw new VideoLinkError("YouTube video havolasi tushunilmadi (kanal emas, aniq video havolasi kerak).");
    return { platform: "youtube", id, url: `https://www.youtube.com/watch?v=${id}` };
  }
  if (host === "instagram.com") {
    const m = path.match(/^\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]{5,20})$/);
    if (!m) throw new VideoLinkError("Instagram havolasi tushunilmadi — Reels yoki post havolasini qo'ying (masalan instagram.com/reel/...).");
    return { platform: "instagram", id: m[2], url: `https://www.instagram.com/reel/${m[2]}/` };
  }
  if (host === "tiktok.com") {
    const m = path.match(/^\/@[\w.-]+\/video\/(\d{8,25})$/);
    if (!m) throw new VideoLinkError("TikTok havolasi tushunilmadi — videoning to'liq havolasini qo'ying (tiktok.com/@akkaunt/video/...).");
    return { platform: "tiktok", id: m[1], url: `https://www.tiktok.com${path}` };
  }
  if (host === "vm.tiktok.com" || host === "vt.tiktok.com") throw new VideoLinkError("TikTok'ning qisqa havolasi ishlamaydi — videoni brauzerda ochib, to'liq havolasini nusxalang.");
  throw new VideoLinkError("Faqat YouTube, Instagram yoki TikTok videosi qo'yiladi.");
}

export function videoEmbedUrl(v: { platform: string; id: string }): string {
  if (v.platform === "youtube") return `https://www.youtube-nocookie.com/embed/${v.id}?rel=0`;
  if (v.platform === "instagram") return `https://www.instagram.com/reel/${v.id}/embed/`;
  return `https://www.tiktok.com/embed/v2/${v.id}`;
}

/** Vertikal (Shorts, Reels, TikTok) yoki gorizontal pleyer. */
export function isVertical(v: { platform: string; url?: string | null }): boolean {
  return v.platform !== "youtube" || !!v.url?.includes("/shorts/");
}

export const PLATFORM_LABEL: Record<string, string> = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok" };

/** Video shabloni: bloger joylashdan oldin har birini tasdiqlaydi, admin shular bo'yicha tekshiradi. */
export const VIDEO_RULES = [
  "Video bitta kitob haqida va o'sha kitob saytdan tanlangan",
  "Kitob muqovasi videoda aniq ko'rinadi",
  "Davomiyligi 15 soniyadan 3 daqiqagacha",
  "Videoning oxirida Buqancha yakuniy kadri (shablon) bor",
  "Video o'zingizniki: boshqa birovning videosi emas",
  "Reklama, haqorat, boshqa do'kon yoki sayt havolasi yo'q",
] as const;
