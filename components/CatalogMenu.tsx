"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Topic = { slug: string; name: string; count: number };
type Lang = { slug: string; name: string; count: number; topics: Topic[] };

/** Chap burchakdagi menyu: katalog bo'limlari va sayt sahifalari. */
export function CatalogMenu({ languages, total, instagramUrl }: { languages: Lang[]; total: number; instagramUrl: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const pathname = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // sahifa almashganda yopiladi
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      button.current?.focus();
    };
  }, [open]);

  const link = (href: string) =>
    `flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors hover:bg-surface-2 ${
      pathname === href ? "bg-accent-soft font-semibold text-text" : ""
    }`;

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menyu va katalog"
        aria-expanded={open}
        aria-controls="catalog-menu"
        className="-ml-1 grid size-10 shrink-0 place-items-center rounded-full text-text hover:bg-surface-2"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </button>

      {mounted &&
        createPortal(
      // sarlavhadagi backdrop-blur fixed elementlarni o'ziga qamaydi — panel body'ga chiqariladi
      <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div
          className={`absolute inset-0 bg-black/45 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <div
          id="catalog-menu"
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Menyu"
          className={`menu-panel absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col overflow-y-auto border-r border-border bg-bg shadow-2xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <p className="font-heading text-lg font-semibold">Katalog</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Yopish" className="grid size-10 place-items-center rounded-full hover:bg-surface-2">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col px-2 pb-4" aria-label="Katalog bo'limlari">
            <Link href="/katalog" className={link("/katalog")} tabIndex={open ? 0 : -1}>
              <span className="font-semibold">Barcha kitoblar</span>
              <span className="tabular text-sm text-muted">{total.toLocaleString("ru-RU").replace(/,/g, " ")}</span>
            </Link>
            {languages.map((l, i) => (
              <details key={l.slug} open={i === 0 || pathname.startsWith(`/katalog/${l.slug}`)} className="group mt-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                  <span>{l.name}</span>
                  <span className="flex items-center gap-2 text-sm font-normal text-muted">
                    <span className="tabular">{l.count}</span>
                    <svg viewBox="0 0 24 24" className="size-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </summary>
                <div className="ml-3 flex flex-col border-l border-border pl-2">
                  <Link href={`/katalog/${l.slug}`} className={link(`/katalog/${l.slug}`)} tabIndex={open ? 0 : -1}>
                    <span>Barchasi</span>
                    <span className="tabular text-sm text-muted">{l.count}</span>
                  </Link>
                  {l.topics.map((c) => (
                    <Link key={c.slug} href={`/katalog/${l.slug}/${c.slug}`} className={link(`/katalog/${l.slug}/${c.slug}`)} tabIndex={open ? 0 : -1}>
                      <span>{c.name}</span>
                      <span className="tabular text-sm text-muted">{c.count}</span>
                    </Link>
                  ))}
                </div>
              </details>
            ))}
          </nav>
          <div className="mx-4 border-t border-border" />
          <nav className="flex flex-col px-2 py-4" aria-label="Sayt bo'limlari">
            {[
              ["/manzillar", "Do'konlar manzillari"],
              ["/sotuvchilar", "Sotuvchilar"],
              ["/hamkorlik", "Hamkor bo'lish"],
              ["/qidiruv", "Qidiruv"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className={link(href)} tabIndex={open ? 0 : -1}>
                {label}
              </Link>
            ))}
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={link("#ig")} tabIndex={open ? 0 : -1}>
              Instagram
            </a>
          </nav>
        </div>
      </div>,
          document.body,
        )}
    </>
  );
}
