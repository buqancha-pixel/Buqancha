"use client";

import { useEffect } from "react";

/**
 * Bloger sahifasi ko'rilganini (brauzer kuniga bir marta) va sahifadan kitobga o'tilganini sanaydi.
 * Faqat son yuboriladi — shaxsiy ma'lumot yo'q.
 */
export function PromoterStats({ id }: { id: string }) {
  useEffect(() => {
    const send = (t: "view" | "click") => {
      const body = JSON.stringify({ p: id, t });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/stat", new Blob([body], { type: "application/json" }));
      else fetch("/api/stat", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    };
    const key = `bq-view-${id}-${new Date().toISOString().slice(0, 10)}`;
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        send("view");
      }
    } catch {
      send("view");
    }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('[data-bloger-kitoblar] a[href^="/kitob/"]');
      if (a) send("click");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [id]);
  return null;
}
