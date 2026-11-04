import { sellerContacts, type Contact } from "@/lib/contacts";

const ICON: Record<Contact["kind"], string> = { telegram: "✈️", phone: "📞", instagram: "📷", website: "🌐", social: "🔗" };

/**
 * Sayt havolasi yo'q narx uchun: "Buyurtma berish" — bosilganda do'kon o'zi kiritgan aloqalar ochiladi
 * (JS kerak emas: <details>).
 */
export function OrderMenu({ seller, title, inStock }: { seller: Parameters<typeof sellerContacts>[0] & { name: string }; title: string; inStock: boolean }) {
  const contacts = sellerContacts(seller);
  if (!contacts.length) return <span className="shrink-0 px-2 text-xs text-muted">Aloqa ko&apos;rsatilmagan</span>;
  return (
    <details className="relative shrink-0 [&_summary::-webkit-details-marker]:hidden">
      <summary
        className={`cursor-pointer list-none rounded-full px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${
          inStock ? "bg-accent text-accent-contrast" : "border border-border"
        }`}
      >
        Buyurtma berish<span aria-hidden="true"> ▾</span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-border bg-bg p-2 shadow-2xl ring-1 ring-black/20">
        <p className="px-2 pb-1 pt-1 text-xs text-muted">
          {seller.name} bilan bog&apos;laning va «{title}» kitobini so&apos;rang:
        </p>
        {contacts.map((c) => (
          <a
            key={c.href}
            href={c.href}
            target={c.kind === "phone" ? undefined : "_blank"}
            rel="nofollow noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium hover:bg-surface-2"
          >
            <span aria-hidden="true">{ICON[c.kind]}</span>
            {c.label}
          </a>
        ))}
      </div>
    </details>
  );
}
