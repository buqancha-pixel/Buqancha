"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const INTERVAL = 6000;

/**
 * Banner karuseli: barmoq bilan suriladi, o'zi aylanadi (sichqoncha ustida, fokusda yoki
 * teginishdan keyin to'xtaydi; "harakatni kamaytirish" yoqilgan bo'lsa aylanmaydi).
 */
export function BannerCarousel({ children, label }: { children: ReactNode; label: string }) {
  const slides = Children.toArray(children);
  const n = slides.length;
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback(
    (k: number) => {
      const el = ref.current;
      if (!el || !n) return;
      const idx = ((k % n) + n) % n;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: idx * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
    },
    [n],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setActive(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (paused || n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (!document.hidden) go(active + 1);
    }, INTERVAL);
    return () => clearInterval(t);
  }, [active, paused, n, go]);

  // teginishdan keyin bir muddat to'xtab turadi
  const pauseAfterTouch = () => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 12000);
  };
  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  return (
    <div
      role="region"
      aria-roledescription="karusel"
      aria-label={label}
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={pauseAfterTouch}
    >
      <div className="relative">
        <div ref={ref} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-card">
          {slides.map((s, i) => (
            <div key={i} role="group" aria-roledescription="slayd" aria-label={`${i + 1} / ${n}`} className="w-full shrink-0 snap-start">
              {s}
            </div>
          ))}
        </div>
        {n > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label="Oldingi"
              className="banner-arrow absolute left-3 top-1/2 hidden -translate-y-1/2 sm:grid"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label="Keyingi"
              className="banner-arrow absolute right-3 top-1/2 hidden -translate-y-1/2 sm:grid"
            >
              ›
            </button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`${i + 1}-banner`}
              aria-current={i === active}
              className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-accent" : "w-2 bg-border hover:bg-muted"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
