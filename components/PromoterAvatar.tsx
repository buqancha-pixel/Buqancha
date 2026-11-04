"use client";

import { useState } from "react";

/** Bloger rasmi; yuklanmasa yoki bo'lmasa — ism bosh harflari. */
export function PromoterAvatar({ name, photoUrl, color, size = 64 }: { name: string; photoUrl?: string | null; color: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-heading font-semibold text-white ring-2 ring-border"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 60%, black))`, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials}
      {photoUrl && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
      )}
    </span>
  );
}
