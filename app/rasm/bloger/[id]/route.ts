import { prisma } from "@/lib/db";

/** Bloger profil rasmi. Manzilda ?v=<yuklangan vaqt> bor — shuning uchun uzoq keshlanadi. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9_-]{1,40}$/i.test(id)) return new Response("Topilmadi", { status: 404 });
  const photo = await prisma.promoterPhoto.findUnique({ where: { promoterId: id } });
  if (!photo) return new Response("Topilmadi", { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
