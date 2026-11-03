import type { Metadata } from "next";
import Link from "next/link";
import type { SellerType } from "@prisma/client";
import { getSellers } from "@/lib/books";
import { SELLER_TYPE_LABEL, SELLER_TYPE_PLURAL } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sotuvchilar — kitob do'konlari, nashriyotlar va marketpleyslar",
  description:
    "Buqancha narxlarini solishtiradigan kitob do'konlari, nashriyotlar va marketpleyslar ro'yxati: shahar, sayt va takliflar soni.",
  alternates: { canonical: "/sotuvchilar" },
};

const ORDER: SellerType[] = ["STORE", "PUBLISHER", "MARKETPLACE"];

export default async function SellersPage() {
  const sellers = await getSellers();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="text-3xl sm:text-4xl">Sotuvchilar</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Narxlarini solishtiradigan do'konlar, nashriyotlar va marketpleyslar. Ro'yxatda yo'qmisiz?{" "}
        <Link href="/hamkorlik" className="font-semibold text-accent hover:underline">
          Hamkor bo'ling
        </Link>
        .
      </p>

      {ORDER.map((type) => {
        const list = sellers.filter((s) => s.type === type);
        if (!list.length) return null;
        return (
          <section key={type} className="mt-10" aria-labelledby={`h-${type}`}>
            <h2 id={`h-${type}`} className="text-xl sm:text-2xl">
              {SELLER_TYPE_PLURAL[type]} <span className="tabular text-muted">({list.length})</span>
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => (
                <li key={s.id} className="card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold">{s.name}</h3>
                    <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted ring-1 ring-border">
                      {SELLER_TYPE_LABEL[s.type]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{s.city}</p>
                  {s.description && <p className="mt-3 text-sm">{s.description}</p>}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-sm">
                    <span className="tabular text-muted">{s._count.offers} ta taklif</span>
                    {s.website && (
                      <a href={s.website} target="_blank" rel="nofollow noopener noreferrer" className="font-semibold text-accent hover:underline">
                        {s.website.replace(/^https?:\/\//, "")} ↗
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
