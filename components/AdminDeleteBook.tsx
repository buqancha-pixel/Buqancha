"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { quickDeleteBookAction } from "@/app/admin/actions";

/**
 * Admin kirgan bo'lsa: kitobni saytning o'zidan o'chirish (tasdiqlash so'raladi).
 * "card" — katalogdagi muqova burchagida; "button" — kitob sahifasidagi admin qatorida.
 * O'chirilgan kitob kechki yig'ishda qayta qo'shilmaydi.
 */
export function AdminDeleteBook({ id, title, variant, afterDelete = "refresh" }: { id: string; title: string; variant: "card" | "button"; afterDelete?: "refresh" | "catalog" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`«${title}» saytdan butunlay o'chirilsinmi? Barcha nashr va narxlari ham o'chadi.`)) return;
    start(async () => {
      const res = await quickDeleteBookAction(id);
      if (!res.ok) return alert(res.message);
      setGone(true);
      if (afterDelete === "catalog") router.replace("/katalog");
      else router.refresh();
    });
  };

  if (variant === "card")
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending || gone}
        aria-label={`O'chirish: ${title}`}
        title="Kitobni o'chirish (admin)"
        className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-black/70 text-white shadow-lg ring-1 ring-white/30 hover:bg-red-600 disabled:opacity-50"
      >
        {pending ? "…" : (
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
          </svg>
        )}
      </button>
    );
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || gone}
      className="rounded-full border border-red-500/60 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50 dark:text-red-400"
    >
      {pending ? "O'chirilmoqda…" : "Kitobni o'chirish"}
    </button>
  );
}
