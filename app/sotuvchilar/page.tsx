import type { Metadata } from "next";
import Link from "next/link";
import { sellerContacts } from "@/lib/contacts";
import { SellerLogo } from "@/components/SellerLogo";
import { sellerPhotoSrc } from "@/lib/seller/photo";
import type { SellerType } from "@prisma/client";
import { getSellers } from "@/lib/books";
import { SELLER_TYPE_LABEL, SELLER_TYPE_PLURAL, formatRelative } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sotuvchilar — kitob do'konlari, nashriyotlar va marketpleyslar",
  description:
    "O'zbekistondagi kitob do'konlari, nashriyotlar va marketpleyslar katalogi: shahar, manzil, sayt va Buqanchadagi takliflar soni.",
  alternates: { canonical: "/sotuvchilar" },
};

const ORDER: SellerType[] = ["STORE", "ONLINE", "PUBLISHER", "MARKETPLACE"];

const COLLECTOR_LABEL = {
  FEED: "Narxlar hamkor feed'idan",
  PRODUCT_PAGE: "Narxlar sayt sahifalaridan avtomatik",
  NONE: "Narxlar qo'lda kiritiladi",
} as const;

type SellerRow = Awaited<ReturnType<typeof getSellers>>[number];

export default async function SellersPage() {
  const sellers = await getSellers();
  const active = sellers.filter((s) => s._count.offers > 0);
  const catalog = sellers.filter((s) => s._count.offers === 0);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="text-3xl sm:text-4xl">Sotuvchilar</h1>
      <p className="mt-3 max-w-2xl text-muted">
        O'zbekistondagi kitob do'konlari, nashriyotlar va marketpleyslar. Hozir {active.length} tasining narxlari
        solishtiriladi, yana {catalog.length} tasi katalogda. Ro'yxatda yo'qmisiz yoki narxlaringizni qo'shmoqchimisiz?{" "}
        <Link href="/hamkorlik" className="font-semibold text-accent hover:underline">
          Hamkor bo'ling
        </Link>
        .
      </p>

      <section className="mt-10" aria-labelledby="h-active">
        <h2 id="h-active" className="text-xl sm:text-2xl">
          Narxlari solishtiriladi <span className="tabular text-muted">({active.length})</span>
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((s) => (
            <SellerCard key={s.id} s={s} />
          ))}
        </ul>
      </section>

      {ORDER.map((type) => {
        // sayti bor (tekshirish oson) sotuvchilar oldinda
        const list = catalog
          .filter((s) => s.type === type)
          .sort((a, b) => Number(!!b.website) - Number(!!a.website) || a.name.localeCompare(b.name));
        if (!list.length) return null;
        return (
          <section key={type} className="mt-12" aria-labelledby={`h-${type}`}>
            <h2 id={`h-${type}`} className="text-xl sm:text-2xl">
              {SELLER_TYPE_PLURAL[type]} <span className="tabular text-muted">({list.length})</span>
            </h2>
            <p className="mt-1 text-sm text-muted">Katalogda — narxlari hali qo'shilmagan.</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => (
                <SellerCard key={s.id} s={s} />
              ))}
            </ul>
          </section>
        );
      })}

      <p className="mt-12 max-w-2xl text-xs text-muted">
        Manzil va aloqa ma'lumotlari ochiq kataloglar va OAV materiallaridan olingan, eskirgan bo'lishi mumkin. Xato
        topsangiz, <Link href="/hamkorlik" className="underline">bizga yozing</Link>.
      </p>
    </div>
  );
}

function SellerCard({ s }: { s: SellerRow }) {
  const link = s.website ?? (s.social ? `https://${s.social}` : null);
  const contacts = sellerContacts(s);
  return (
    <li className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <SellerLogo name={s.name} src={sellerPhotoSrc(s)} size={44} />
          <h3 className="min-w-0 text-lg font-semibold">
            <Link href={`/sotuvchilar/${s.slug}`} className="hover:underline">{s.name}</Link>
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted ring-1 ring-border">
          {SELLER_TYPE_LABEL[s.type]}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {s.city}
        {s.address && ` · ${s.address}`}
      </p>
      {s.description && <p className="mt-3 text-sm">{s.description}</p>}
      {s._count.offers > 0 && (
        <p className="mt-3 text-xs text-muted">
          {COLLECTOR_LABEL[s.collector]}
          {s.runs[0] && ` · oxirgi yangilanish ${formatRelative(s.runs[0].startedAt)}`}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-sm">
        {s._count.offers ? (
          <span className="tabular text-muted">{s._count.offers} ta narx</span>
        ) : null}
        {s._count.offers ? (
          <Link href={`/sotuvchilar/${s.slug}`} className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-contrast">
            Kitoblarini ko&apos;rish →
          </Link>
        ) : (
          <span className="tabular text-muted">Narx yo&apos;q</span>
        )}
        {!contacts.length && link && (
          <a href={link} target="_blank" rel="nofollow noopener noreferrer" className="truncate font-semibold text-accent hover:underline">
            {link.replace(/^https?:\/\//, "")} ↗
          </a>
        )}
      </div>
      {contacts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {contacts.map((c) => (
            <a key={c.href} href={c.href} target={c.kind === "phone" ? undefined : "_blank"} rel="nofollow noopener noreferrer" className="rounded-full border border-border px-3 py-1 font-medium hover:border-accent">
              {c.label}
            </a>
          ))}
        </div>
      )}
    </li>
  );
}
