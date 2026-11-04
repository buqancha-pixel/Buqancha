import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDate } from "@/lib/format";
import { PLATFORM_LABEL, VIDEO_RULES } from "@/lib/video";
import { postImageSrc } from "@/lib/promoter/posts";
import { VideoEmbed } from "@/components/VideoEmbed";
import { approvePostAction, deletePostAdminAction, rejectPostAction } from "../actions";
import { Button, Flash, PageTitle, type SP } from "../ui";

const KIND = { ARTICLE: "📝 Maqola", PHOTO: "🖼 Rasmli post", VIDEO: "🎬 Video" } as const;
const STATUS = { PENDING: "⏳ Kutilmoqda", APPROVED: "✓ Saytda", REJECTED: "✗ Rad etilgan" } as const;

export default async function AdminPosts({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const all = sp.holat === "hammasi";
  const posts = await prisma.promoterPost.findMany({
    where: all ? {} : { status: "PENDING" },
    orderBy: { createdAt: all ? "desc" : "asc" },
    take: 60,
    include: { promoter: { select: { name: true, instagram: true, slug: true } }, book: { select: { title: true, slug: true } }, images: { select: { id: true }, orderBy: { position: "asc" } } },
  });
  const pending = all ? await prisma.promoterPost.count({ where: { status: "PENDING" } }) : posts.length;
  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-sm ${on ? "bg-text text-bg" : "border border-border"}`;

  return (
    <div>
      <PageTitle>Bloger postlari</PageTitle>
      <Flash sp={sp} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/postlar" className={chip(!all)}>Tasdiq kutayotgan videolar ({pending})</Link>
        <Link href="/admin/postlar?holat=hammasi" className={chip(all)}>Barcha postlar</Link>
      </div>
      <p className="mb-4 text-sm text-muted">
        Maqola va rasmli postlar darhol chiqadi (keraksizini shu yerdan o&apos;chirasiz). Videolar faqat siz tasdiqlagach chiqadi —
        shablonga mos bo&apos;lmasa, sababini tanlab rad eting.
      </p>
      {!posts.length && <p className="card p-6 text-center text-muted">{all ? "Hali post yo'q." : "Tasdiq kutayotgan video yo'q."}</p>}
      <ul className="grid gap-4">
        {posts.map((p) => (
          <li key={p.id} className="card grid gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{KIND[p.kind]}</span>
              <span className="text-muted">· {STATUS[p.status]} · {formatDate(p.createdAt)} ·</span>
              <Link href={`/admin/targibotchilar`} className="font-medium hover:underline">{p.promoter.name}</Link>
              <span className="text-muted">@{p.promoter.instagram}</span>
            </div>
            <p className="text-lg font-semibold">{p.title}</p>
            {p.book && (
              <p className="text-sm">
                Kitob: <Link href={`/kitob/${p.book.slug}`} target="_blank" className="text-accent underline">{p.book.title}</Link>
              </p>
            )}
            {p.kind === "VIDEO" && p.videoPlatform && p.videoId && (
              <div className="grid gap-2">
                <VideoEmbed platform={p.videoPlatform} id={p.videoId} url={p.videoUrl} title={p.title} />
                <a href={p.videoUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-accent underline">
                  {PLATFORM_LABEL[p.videoPlatform]}da ochish ↗
                </a>
              </div>
            )}
            {p.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {p.images.map((im) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={im.id} src={postImageSrc(im.id)} alt="" className="h-28 rounded-lg object-cover ring-1 ring-border" />
                ))}
              </div>
            )}
            {p.body && <p className="line-clamp-6 whitespace-pre-line text-sm text-muted">{p.body}</p>}
            {p.status === "REJECTED" && p.rejectReason && <p className="text-sm text-red-500">Sabab: {p.rejectReason}</p>}

            {p.kind === "VIDEO" && p.status !== "APPROVED" && (
              <details className="rounded-xl bg-surface-2 p-3 text-sm" open={p.status === "PENDING"}>
                <summary className="cursor-pointer font-semibold">Shablon bo&apos;yicha tekshiring</summary>
                <ol className="mt-2 grid list-decimal gap-1 pl-5 text-muted">
                  {VIDEO_RULES.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ol>
              </details>
            )}
            <div className="flex flex-wrap items-start gap-2">
              {p.status !== "APPROVED" && (
                <form action={approvePostAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <Button className="h-10">✓ Tasdiqlash</Button>
                </form>
              )}
              {p.status !== "REJECTED" && (
                <form action={rejectPostAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <select name="reason" defaultValue="" className="h-10 max-w-[18rem] rounded-full border border-border bg-bg px-3 text-xs">
                    <option value="">— rad etish sababi —</option>
                    {VIDEO_RULES.map((r) => (
                      <option key={r} value={`Shablon talabi bajarilmagan: «${r}»`}>{r}</option>
                    ))}
                    <option value="Sifatsiz yoki mavzuga mos emas">Sifatsiz yoki mavzuga mos emas</option>
                  </select>
                  <input name="comment" placeholder="Izoh (ixtiyoriy)" maxLength={200} className="h-10 w-40 rounded-full border border-border bg-bg px-3 text-xs" />
                  <Button variant="ghost" className="h-10">✗ Rad etish</Button>
                </form>
              )}
              <form action={deletePostAdminAction} className="ml-auto">
                <input type="hidden" name="id" value={p.id} />
                <button className="h-10 text-xs text-muted underline">O&apos;chirish</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
