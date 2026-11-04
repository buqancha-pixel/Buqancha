import type { PostKind } from "@prisma/client";
import { prisma } from "../db";
import { AdminError } from "../admin/books";
import { toWebpInside } from "../photo";
import { parseVideoUrl, VideoLinkError, VIDEO_RULES } from "../video";

export const MAX_IMAGES = 6;
const MAX_POSTS_PER_DAY = 10;
const ARTICLE_MAX_WORDS = 3000;
const CAPTION_MAX_WORDS = 500;

const words = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
const s = (d: FormData, k: string) => String(d.get(k) ?? "").trim();

function cleanText(raw: string, maxWords: number, what: string, minWords = 0): string | null {
  const t = raw.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const n = words(t);
  if (n < minWords) throw new AdminError(`${what} juda qisqa — kamida ${minWords} so'z yozing.`);
  if (n > maxWords) throw new AdminError(`${what} ${n} so'z — ko'pi bilan ${maxWords} so'z.`);
  return t || null;
}

/** Kitob faqat blogerning o'z tavsiyalaridan (yoki bo'sh). */
async function ownBook(promoterId: string, bookId: string, required: boolean): Promise<string | null> {
  if (!bookId) {
    if (required) throw new AdminError("Video qaysi kitob haqida — kitobni tanlang (avval uni tavsiya qiling).");
    return null;
  }
  const ok = await prisma.promoterBook.findUnique({ where: { promoterId_bookId: { promoterId, bookId } } });
  if (!ok) throw new AdminError("Kitob tavsiyalaringizda yo'q.");
  return bookId;
}

export async function createPost(promoterId: string, kind: PostKind, d: FormData): Promise<{ id: string; pending: boolean }> {
  const today = new Date(Date.now() - 864e5);
  if ((await prisma.promoterPost.count({ where: { promoterId, createdAt: { gte: today } } })) >= MAX_POSTS_PER_DAY)
    throw new AdminError(`Bir kunda ko'pi bilan ${MAX_POSTS_PER_DAY} ta post.`);
  const title = s(d, "title").slice(0, 120);
  if (title.length < 3) throw new AdminError("Sarlavha yozing.");
  const files = d.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_IMAGES) throw new AdminError(`Ko'pi bilan ${MAX_IMAGES} ta rasm.`);

  let body: string | null;
  let video: { videoPlatform: string; videoId: string; videoUrl: string } | null = null;
  let bookId: string | null;
  if (kind === "ARTICLE") {
    body = cleanText(s(d, "body"), ARTICLE_MAX_WORDS, "Maqola", 50);
    bookId = await ownBook(promoterId, s(d, "bookId"), false);
  } else if (kind === "PHOTO") {
    if (!files.length) throw new AdminError("Kamida bitta rasm tanlang.");
    body = cleanText(s(d, "body"), CAPTION_MAX_WORDS, "Izoh");
    bookId = await ownBook(promoterId, s(d, "bookId"), false);
  } else {
    try {
      const v = parseVideoUrl(s(d, "videoUrl"));
      video = { videoPlatform: v.platform, videoId: v.id, videoUrl: v.url };
    } catch (e) {
      throw new AdminError(e instanceof VideoLinkError ? e.message : "Video havolasi noto'g'ri.");
    }
    if (await prisma.promoterPost.findFirst({ where: { videoPlatform: video.videoPlatform, videoId: video.videoId, status: { not: "REJECTED" } } }))
      throw new AdminError("Bu video allaqachon joylangan.");
    const missing = VIDEO_RULES.filter((_, i) => d.get(`rule${i}`) !== "on");
    if (missing.length) throw new AdminError(`Video shablonga mos bo'lishi kerak. Belgilanmagan: «${missing[0]}».`);
    body = cleanText(s(d, "body"), CAPTION_MAX_WORDS, "Izoh");
    bookId = await ownBook(promoterId, s(d, "bookId"), true);
  }

  const images = [];
  for (const f of files) images.push(await toWebpInside(f));
  const pending = kind === "VIDEO"; // videolar admin tasdig'idan keyin chiqadi
  const post = await prisma.promoterPost.create({
    data: {
      promoterId,
      kind,
      title,
      body,
      bookId,
      ...(video ?? {}),
      status: pending ? "PENDING" : "APPROVED",
      publishedAt: pending ? null : new Date(),
      images: { create: images.map((im, position) => ({ ...im, position })) },
    },
  });
  return { id: post.id, pending };
}

/** Post manzili va rasm manzili (saytda). */
export const postImageSrc = (imageId: string) => `/rasm/post/${imageId}`;
