"use client";

import { useState } from "react";

/** Sotuvchi logotipi (oq fonda, kesilmagan); rasm bo'lmasa — nomining bosh harflari. */
export function SellerLogo({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .replace(/[«»"']/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const box = { width: size, height: size };
  if (src && !failed)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} style={box} className="shrink-0 rounded-xl bg-white object-contain p-0.5 ring-1 ring-border" />
    );
  return (
    <span style={{ ...box, fontSize: size * 0.36 }} className="grid shrink-0 place-items-center rounded-xl bg-surface-2 font-heading font-semibold text-muted ring-1 ring-border" aria-hidden="true">
      {initials}
    </span>
  );
}
