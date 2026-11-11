import Link from "next/link";
import { PLATFORM_LABEL } from "@/lib/video";
import { postImageSrc } from "@/lib/promoter/posts";

type Post = {
  id: string; kind: "ARTICLE" | "PHOTO" | "VIDEO"; title: string; body: string | null;
  videoPlatform: string | null; videoId: string | null; images: Array<{ id: string }>; book: { title: string } | null;
};

const PLATFORM_BG: Record<string, string> = {
  youtube: "bg-[#FF0000]",
  instagram: "bg-[radial-gradient(circle_at_30%_110%,#fdf497_0%,#fd5949_45%,#d6249f_60%,#285aeb_90%)]",
  tiktok: "bg-[linear-gradient(135deg,#25f4ee,#000_45%,#000_55%,#fe2c55)]",
};

/** Bloger posti kartochkasi: video, maqola yoki rasmli post. */
export function PostCard({ post: p, href, by }: { post: Post; href: string; by?: string }) {
  const img = p.images[0] ? postImageSrc(p.images[0].id) : p.videoPlatform === "youtube" && p.videoId ? `https://i.ytimg.com/vi/${p.videoId}/hqdefault.jpg` : null;
  return (
    <Link href={href} className="card group flex flex-col overflow-hidden hover:border-accent">
      <div className={`relative aspect-[4/3] w-full overflow-hidden ${img ? "bg-black" : p.videoPlatform ? PLATFORM_BG[p.videoPlatform] : "bg-surface-2"}`}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center font-heading text-lg font-semibold text-white">
            {p.kind === "ARTICLE" ? <span className="text-text">📝</span> : p.title}
          </div>
        )}
        {p.kind === "VIDEO" && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-14 place-items-center rounded-full bg-black/60 text-2xl text-white ring-2 ring-white/70">▶</span>
          </span>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white">
          {p.kind === "VIDEO" ? `🎬 ${PLATFORM_LABEL[p.videoPlatform ?? ""] ?? "Video"}` : p.kind === "ARTICLE" ? "📝 Maqola" : "🖼 Rasm"}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 font-semibold">{p.title}</p>
        {p.kind === "ARTICLE" && p.body && <p className="mt-1 line-clamp-3 text-sm text-muted">{p.body}</p>}
        <p className="mt-auto pt-2 text-xs text-muted">
          {by ? `${by}` : ""}
          {by && p.book ? " · " : ""}
          {p.book ? `📖 ${p.book.title}` : ""}
        </p>
      </div>
    </Link>
  );
}
