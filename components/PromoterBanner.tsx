/**
 * Bloger sahifasi tepasidagi banner: yuklangan rasm yoki tavsiya qilgan kitoblari muqovalaridan kollaj
 * (blogerning rangidagi fon ustida). Hech qachon bo'sh ko'rinmaydi.
 */
export function PromoterBanner({ src, covers, color }: { src: string | null; covers: string[]; color: string }) {
  if (src)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="aspect-[3/1] w-full rounded-card object-cover ring-1 ring-border" />
    );
  const shown = covers.slice(0, 7);
  return (
    <div
      className="relative aspect-[3/1] w-full overflow-hidden rounded-card ring-1 ring-border"
      style={{ background: `radial-gradient(120% 140% at 15% 20%, color-mix(in oklab, ${color} 85%, white) 0%, ${color} 45%, color-mix(in oklab, ${color} 40%, black) 100%)` }}
      aria-hidden="true"
    >
      <div className="absolute inset-y-0 right-[-4%] flex w-[78%] items-center justify-end gap-[2.5%] pr-[4%]">
        {shown.map((c, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={c}
            src={c}
            alt=""
            referrerPolicy="no-referrer"
            loading="lazy"
            className="h-[78%] w-auto shrink-0 rounded-md object-cover shadow-2xl ring-1 ring-white/20"
            style={{ transform: `rotate(${(i % 2 ? 1 : -1) * (3 + (i % 3))}deg) translateY(${i % 2 ? 6 : -6}%)`, opacity: 1 - i * 0.06 }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-transparent" />
    </div>
  );
}
