"use client";

import { useState, type ReactNode } from "react";

/**
 * Sotuvchi saytidagi muqova rasmi (o'zimizga ko'chirilmaydi).
 * Yuklanmasa yoki buzilgan bo'lsa — chizilgan muqovaga qaytadi.
 */
export function CoverImage({ src, fallback }: { src: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <>
      {fallback}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full bg-white object-cover"
      />
    </>
  );
}
