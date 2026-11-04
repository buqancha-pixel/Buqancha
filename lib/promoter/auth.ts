import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Promoter } from "@prisma/client";
import { prisma } from "../db";
import { hashToken, safeEqual, sessionSecret, sign } from "../partner/auth";

/**
 * Bloger kabineti: targ'ibotchi faqat o'z ma'lumotlari va tavsiyalarini boshqaradi.
 * Kirish — admin yaratgan maxfiy havola; bazada faqat kalit xeshi. Yangi havola eskisini va sessiyalarni
 * bekor qiladi. Imzo hamkor sessiyasi bilan bir kalitda, lekin "bloger." prefiksi bilan — biri ikkinchisiga o'tmaydi.
 */
const COOKIE = "buqancha_bloger";
const DAYS = 90;

export function promoterCabinetEnabled(): boolean {
  return sessionSecret() !== null;
}

export async function promoterByToken(token: string): Promise<Promoter | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  return prisma.promoter.findUnique({ where: { tokenHash: hashToken(token) } });
}

export async function startPromoterSession(p: Promoter): Promise<void> {
  const key = sessionSecret();
  if (!key || !p.tokenHash) throw new Error("Bloger kabineti yoqilmagan");
  const exp = String(Date.now() + DAYS * 864e5);
  const payload = `${p.id}.${exp}.${p.tokenHash.slice(0, 16)}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(`bloger.${payload}`, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAYS * 86400,
  });
}

export async function endPromoterSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** Joriy bloger (sessiya bo'lsa). */
export async function currentPromoter(): Promise<Promoter | null> {
  const key = sessionSecret();
  if (!key) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [id, exp, tokenPrefix, sig] = parts;
  const payload = `${id}.${exp}.${tokenPrefix}`;
  if (Number(exp) < Date.now() || !safeEqual(sig, sign(`bloger.${payload}`, key))) return null;
  const p = await prisma.promoter.findUnique({ where: { id } });
  if (!p?.tokenHash || !p.tokenHash.startsWith(tokenPrefix)) return null;
  return p;
}

export async function requirePromoter(): Promise<Promoter> {
  const p = await currentPromoter();
  if (!p) redirect("/bloger/kirish");
  return p;
}
