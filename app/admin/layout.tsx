import type { Metadata } from "next";
import Link from "next/link";
import { isAdmin } from "@/lib/admin/auth";
import { logout } from "./actions";

export const metadata: Metadata = {
  title: "Boshqaruv",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const NAV = [
  ["/admin", "Bosh"],
  ["/admin/kitoblar", "Kitoblar"],
  ["/admin/korib-chiqish", "Ko'rib chiqish"],
  ["/admin/sotuvchilar", "Sotuvchilar"],
  ["/admin/targibotchilar", "Targ'ibotchilar"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {admin && (
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-full border border-border bg-surface-2 px-3 py-1.5 font-medium hover:border-accent">
              {label}
            </Link>
          ))}
          <form action={logout} className="ml-auto">
            <button className="text-muted underline hover:text-text">Chiqish</button>
          </form>
        </nav>
      )}
      {children}
    </div>
  );
}
