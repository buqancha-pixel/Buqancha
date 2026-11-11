import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCard } from "@/components/BookCard";
import { JsonLd } from "@/components/JsonLd";
import { PromoterAvatar } from "@/components/PromoterAvatar";
import { PromoterStats } from "@/components/PromoterStats";
import { VideoEmbed } from "@/components/VideoEmbed";
import { formatDate } from "@/lib/format";
import { postImageSrc } from "@/lib/promoter/posts";
import { avatarColor, getPromoterPost, promoterPhotoSrc } from "@/lib/promoters";
import { absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const p = await getPromoterPost(slug, id);
  if (!p) return {};
  const desc = (p.body ?? `${p.promoter.name} (@${p.promoter.instagram})${p.book ? ` — «${p.book.title}»` : ""}`).replace(/\s+/g, " ").slice(0, 160);
  return {
    title: `${p.title} — ${p.promoter.name}`,
    description: desc,
    alternates: { canonical: `/targibotchilar/${slug}/p/${id}` },
    openGraph: p.images[0] ? { images: [absoluteUrl(postImageSrc(p.images[0].id))] } : undefined,
  };
}

export default async function PostPage({ params }: Props) {
  const { slug, id } = await params;
  const post = await getPromoterPost(slug, id);
  if (!post) notFound();
  const pr = post.promoter;
  const paragraphs = (post.body ?? "").split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
  return (
    <article className="mx-auto max-w-3xl px-4 pt-6">
      <PromoterStats id={pr.id} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": post.kind === "VIDEO" ? "VideoObject" : "Article",
          ...(post.kind === "VIDEO" ? { name: post.title, uploadDate: post.publishedAt?.toISOString(), contentUrl: post.videoUrl, description: post.body ?? post.title } : { headline: post.title, datePublished: post.publishedAt?.toISOString() }),
          author: { "@type": "Person", name: pr.name, url: absoluteUrl(`/targibotchilar/${pr.slug}`) },
        }}
      />
      <nav aria-label="Yo'l" className="text-sm text-muted">
        <Link href="/targibotchilar" className="hover:text-text">Kitob targ&apos;ibotchilari</Link> /{" "}
        <Link href={`/targibotchilar/${pr.slug}`} className="hover:text-text">{pr.name}</Link>
      </nav>
      <h1 className="mt-3 text-3xl sm:text-4xl [text-wrap:balance]">{post.title}</h1>
      <Link href={`/targibotchilar/${pr.slug}`} className="mt-3 inline-flex items-center gap-2 text-sm hover:underline">
        <PromoterAvatar name={pr.name} photoUrl={promoterPhotoSrc(pr)} color={avatarColor(pr.name)} size={32} />
        <span className="font-semibold">{pr.name}</span>
        {post.publishedAt && <span className="text-muted">· {formatDate(post.publishedAt)}</span>}
      </Link>

      {post.kind === "VIDEO" && post.videoPlatform && post.videoId && (
        <div className="mt-6">
          <VideoEmbed platform={post.videoPlatform} id={post.videoId} url={post.videoUrl} title={post.title} />
        </div>
      )}
      {post.images.length > 0 && (
        <div className={`mt-6 grid gap-2 ${post.images.length > 1 ? "grid-cols-2" : ""}`}>
          {post.images.map((im, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={im.id}
              src={postImageSrc(im.id)}
              alt={`${post.title} — ${i + 1}-rasm`}
              width={im.width}
              height={im.height}
              loading={i ? "lazy" : "eager"}
              className={`w-full rounded-card object-cover ring-1 ring-border ${post.images.length > 1 && i === 0 && post.images.length % 2 ? "col-span-2" : ""}`}
            />
          ))}
        </div>
      )}
      {paragraphs.length > 0 && (
        <div className="mt-6 grid gap-4 text-[17px] leading-relaxed">
          {paragraphs.map((t, i) => (
            <p key={i} className="whitespace-pre-line">{t}</p>
          ))}
        </div>
      )}
      {post.book && (
        <section className="card mt-8 flex flex-wrap items-center gap-4 p-4" aria-label="Kitob">
          <div className="w-32 shrink-0">
            <BookCard book={post.book} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Shu post haqidagi kitob</p>
            <p className="text-lg font-semibold">{post.book.title}</p>
            <Link href={`/kitob/${post.book.slug}`} className="mt-3 inline-block rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast">
              Narxlarni solishtirish →
            </Link>
          </div>
        </section>
      )}
      <p className="mt-8">
        <Link href={`/targibotchilar/${pr.slug}`} className="text-sm font-semibold text-accent hover:underline">← {pr.name}ning boshqa tavsiyalari</Link>
      </p>
    </article>
  );
}
