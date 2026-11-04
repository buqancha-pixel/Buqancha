import Link from "next/link";
import { getPromoters, avatarColor, promoterPhotoSrc } from "@/lib/promoters";
import { PromoterAvatar } from "./PromoterAvatar";

/** Bosh sahifa: banner ostidagi "Kitob targ'ibotchilari" qatori (Instagram stories uslubida). */
export async function PromotersStrip() {
  const promoters = await getPromoters().catch(() => []);
  if (!promoters.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-4" aria-labelledby="promoters-strip">
      <div className="card flex items-center gap-4 overflow-hidden p-3 sm:p-4">
        <div className="hidden shrink-0 sm:block">
          <h2 id="promoters-strip" className="text-base font-semibold sm:text-lg">Kitob targ&apos;ibotchilari</h2>
          <Link href="/targibotchilar" className="text-sm font-semibold text-accent hover:underline">
            Tavsiyalari →
          </Link>
        </div>
        <div className="no-scrollbar -my-1 flex min-w-0 flex-1 gap-4 overflow-x-auto py-1 sm:border-l sm:border-border sm:pl-4">
          <h2 className="sr-only sm:hidden">Kitob targ&apos;ibotchilari</h2>
          {promoters.map((p) => (
            <Link key={p.id} href={`/targibotchilar/${p.slug}`} className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center">
              <span className="rounded-full bg-[conic-gradient(from_200deg,#f9ce34,#ee2a7b,#6228d7,#f9ce34)] p-[2.5px] transition-transform group-hover:scale-105">
                <span className="block rounded-full bg-bg p-[2px]">
                  <PromoterAvatar name={p.name} photoUrl={promoterPhotoSrc(p)} color={avatarColor(p.name)} size={56} />
                </span>
              </span>
              <span className="w-full truncate text-xs font-medium">{p.name}</span>
            </Link>
          ))}
          <Link href="/targibotchilar" className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center sm:hidden">
            <span className="grid size-[65px] place-items-center rounded-full border border-dashed border-border text-xl text-muted">→</span>
            <span className="text-xs font-medium text-muted">Barchasi</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
