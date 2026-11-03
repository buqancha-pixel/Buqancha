"use server";

import type { SellerType } from "@prisma/client";
import { prisma } from "@/lib/db";

export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Partial<Record<string, string>>;
  values?: Record<string, string>;
};

const TYPES: SellerType[] = ["STORE", "PUBLISHER", "MARKETPLACE"];

export async function submitApplication(_prev: FormState, data: FormData): Promise<FormState> {
  const get = (k: string) => String(data.get(k) ?? "").trim();
  const values = {
    orgName: get("orgName"),
    type: get("type"),
    city: get("city"),
    website: get("website"),
    contactName: get("contactName"),
    phone: get("phone"),
    email: get("email"),
    message: get("message"),
  };

  // bot uchun tuzoq
  if (get("company_site")) return { ok: true, message: "Rahmat!" };

  const errors: Record<string, string> = {};
  if (values.orgName.length < 2) errors.orgName = "Tashkilot nomini kiriting.";
  if (!TYPES.includes(values.type as SellerType)) errors.type = "Turini tanlang.";
  if (values.city.length < 2) errors.city = "Shaharni kiriting.";
  if (values.contactName.length < 2) errors.contactName = "Ismingizni kiriting.";
  const digits = values.phone.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 12) errors.phone = "Telefon raqamini to'g'ri kiriting, masalan: +998 90 123 45 67.";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Email manzili noto'g'ri.";
  if (values.website && !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(values.website))
    errors.website = "Sayt manzili noto'g'ri.";
  if (values.message.length > 2000) errors.message = "Xabar juda uzun (2000 belgigacha).";

  if (Object.keys(errors).length) {
    return { ok: false, errors, values, message: "Formadagi xatolarni tuzating." };
  }

  await prisma.partnerApplication.create({
    data: {
      orgName: values.orgName.slice(0, 200),
      type: values.type as SellerType,
      city: values.city.slice(0, 100),
      website: values.website || null,
      contactName: values.contactName.slice(0, 200),
      phone: values.phone.slice(0, 40),
      email: values.email || null,
      message: values.message || null,
    },
  });

  return { ok: true, message: "Arizangiz qabul qilindi! Tez orada siz bilan bog'lanamiz." };
}
