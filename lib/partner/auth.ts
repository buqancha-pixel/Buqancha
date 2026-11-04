import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Seller } from "@prisma/client";
import { prisma } from "../db";

/**
 * Hamkorlar kabineti: do'kon/nashriyot o'z narxlarini o'zi boshqaradi.
 * Kirish — admin yaratgan maxfiy havola (login, parol, telefon saqlanmaydi). Bazada kalitning faqat
 * xeshi turadi; yangi havola yaratilsa, eskisi va undagi sessiyalar bekor bo'ladi.
 */
const COOKIE = "buqancha_hamkor";
const DAYS = 60;

export function sessionSecret(): string | null {
  const s = (process.env.PARTNER_SECRET || process.env.ADMIN_PASSWORD || "").trim();
  return s.length >= 8 ? s : null;
}

export function partnerEnabled(): boolean {
  return sessionSecret() !== null;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Yangi kirish kaliti (URL uchun xavfsiz, 43 belgi). */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function sellerByToken(token: string): Promise<Seller | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  return prisma.seller.findUnique({ where: { partnerTokenHash: hashToken(token) } });
}

export async function startPartnerSession(seller: Seller): Promise<void> {
  const key = sessionSecret();
  if (!key || !seller.partnerTokenHash) throw new Error("Hamkorlar kabineti yoqilmagan");
  const exp = String(Date.now() + DAYS * 864e5);
  // sessiya kalit xeshiga bog'langan: yangi havola yaratilsa — eski sessiyalar ishlamaydi
  const payload = `${seller.id}.${exp}.${seller.partnerTokenHash.slice(0, 16)}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAYS * 86400,
  });
}

export async function endPartnerSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** Joriy hamkor (sessiya bo'lsa). */
export async function currentPartner(): Promise<Seller | null> {
  const key = sessionSecret();
  if (!key) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [id, exp, tokenPrefix, sig] = parts;
  const payload = `${id}.${exp}.${tokenPrefix}`;
  if (Number(exp) < Date.now() || !safeEqual(sig, sign(payload, key))) return null;
  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller?.partnerTokenHash || !seller.partnerTokenHash.startsWith(tokenPrefix)) return null;
  return seller;
}

export async function requirePartner(): Promise<Seller> {
  const s = await currentPartner();
  if (!s) redirect("/hamkor/kirish");
  return s;
}

/** Kabinet faolmi (bepul sinov yoki to'langan muddat ichida). */
export function partnerActive(seller: Pick<Seller, "partnerUntil">, now = new Date()): boolean {
  return !!seller.partnerUntil && seller.partnerUntil > now;
}
