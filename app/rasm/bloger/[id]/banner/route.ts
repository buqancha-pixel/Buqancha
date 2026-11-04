import { prisma } from "@/lib/db";

/** Bloger sahifasi banneri (?v=<yuklangan vaqt> — uzoq keshlanadi). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9_-]{1,40}$/i.test(id)) return new Response("Topilmadi", { status: 404 });
  const b = await prisma.promoterBanner.findUnique({ where: { promoterId: id } });
  if (!b) return new Response("Topilmadi", { status: 404 });
  return new Response(new Uint8Array(b.data), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
