import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hamkor kabineti",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-4xl px-4 py-6">{children}</div>;
}
