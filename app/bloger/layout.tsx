import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bloger kabineti",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function PromoterLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>;
}
