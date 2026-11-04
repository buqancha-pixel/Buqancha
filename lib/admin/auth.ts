import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Admin panelga kirish: bitta parol (Vercel → Environment Variables → ADMIN_PASSWORD).
 * Sessiya — imzolangan cookie; parol o'zgarsa, eski sessiyalar o'z-o'zidan bekor bo'ladi.
 */
const COOKIE = "buqancha_admin";
const DAYS = 30;

function password(): string | null {
  const p = process.env.ADMIN_PASSWORD?.trim();
  return p && p.length >= 8 ? p : null;
}

export function adminEnabled(): boolean {
  return password() !== null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function isAdmin(): Promise<boolean> {
  const key = password();
  if (!key) return false;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(`admin.${exp}`, key));
}

/** Har bir admin sahifasi va amalida chaqiriladi. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/kirish");
}

export async function checkPassword(input: string): Promise<boolean> {
  const key = password();
  if (!key) return false;
  // parolni to'g'ridan-to'g'ri emas, imzosini solishtiramiz (vaqt bo'yicha teng)
  return safeEqual(sign(input, key), sign(key, key));
}

export async function startSession(): Promise<void> {
  const key = password()!;
  const exp = String(Date.now() + DAYS * 864e5);
  (await cookies()).set(COOKIE, `${exp}.${sign(`admin.${exp}`, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAYS * 86400,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
