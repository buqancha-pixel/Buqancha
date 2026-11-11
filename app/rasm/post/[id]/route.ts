import { prisma } from "@/lib/db";

/** Bloger post rasmi (faqat saytda ko'rinadigan, ya'ni tasdiqlangan postlar; admin va bloger o'zi uchun ham). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return new Response("Topilmadi", { status: 404 });
  const img = await prisma.promoterPostImage.findUnique({ where: { id }, select: { data: true } });
  if (!img) return new Response("Topilmadi", { status: 404 });
  // rasm ID'si o'zgarmaydi (yangi rasm — yangi ID), shuning uchun uzoq keshlanadi
  return new Response(new Uint8Array(img.data), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
