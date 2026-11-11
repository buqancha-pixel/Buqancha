import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Video shabloni — yakuniy kadr: bloger videosining oxiriga 2–3 soniya qo'yadi.
 * ?f=v — vertikal 1080×1920 (Reels, Shorts, TikTok), ?f=h — gorizontal 1920×1080 (YouTube).
 */
export async function GET(req: Request, { params }: { params: Promise<{ promoterId: string }> }) {
  const { promoterId } = await params;
  if (!/^[a-z0-9_-]{1,40}$/i.test(promoterId)) return new Response("Topilmadi", { status: 404 });
  const p = await prisma.promoter.findUnique({ where: { id: promoterId }, include: { photo: true } });
  if (!p) return new Response("Topilmadi", { status: 404 });
  const vertical = new URL(req.url).searchParams.get("f") !== "h";
  const [W, H] = vertical ? [1080, 1920] : [1920, 1080];
  const [manrope, unbounded] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Manrope-800.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Unbounded-700.ttf")),
  ]);
  const avatar = p.photo
    ? `data:image/png;base64,${(await sharp(Buffer.from(p.photo.data)).resize(240, 240).png().toBuffer()).toString("base64")}`
    : null;
  const host = SITE_URL.replace(/^https?:\/\//, "");
  const k = vertical ? 1 : 0.8;

  const img = new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "radial-gradient(circle at 50% 30%, #1f2a5c 0%, #0b1026 55%, #05070f 100%)", color: "white", fontFamily: "Manrope",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 * k }}>
          <div style={{ display: "flex", width: 120 * k, height: 120 * k, borderRadius: 32 * k, background: "#ffd166", color: "#1a1300", alignItems: "center", justifyContent: "center", fontFamily: "Unbounded", fontSize: 76 * k }}>B</div>
          <div style={{ display: "flex", fontFamily: "Unbounded", fontSize: 96 * k }}>Buqancha</div>
        </div>
        <div style={{ display: "flex", marginTop: 70 * k, fontSize: 58 * k, textAlign: "center", maxWidth: 900 * (vertical ? 1 : 1.6), lineHeight: 1.2 }}>
          Bu kitobning eng arzon narxini toping
        </div>
        <div style={{ display: "flex", marginTop: 50 * k, padding: `${26 * k}px ${54 * k}px`, borderRadius: 999, background: "#ffd166", color: "#1a1300", fontSize: 54 * k }}>
          {host}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 * k, marginTop: 110 * k }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} width={120 * k} height={120 * k} alt="" style={{ borderRadius: 999, border: "4px solid rgba(255,255,255,.85)" }} />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30 * k, opacity: 0.7 }}>Tavsiyalarim:</div>
            <div style={{ display: "flex", fontSize: 50 * k }}>@{p.instagram}</div>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "Manrope", data: manrope, weight: 800, style: "normal" },
        { name: "Unbounded", data: unbounded, weight: 700, style: "normal" },
      ],
    },
  );
  const headers = new Headers(img.headers);
  headers.set("Cache-Control", "public, max-age=600");
  headers.set("Content-Disposition", `attachment; filename="buqancha-shablon-${vertical ? "vertikal" : "gorizontal"}.png"`);
  return new Response(img.body, { status: 200, headers });
}
