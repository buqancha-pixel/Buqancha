/**
 * Google xaritasi (kalitsiz joylash): qidiruv natijalari — Google biladigan barcha kitob do'konlari.
 * Xarita Google'ning o'zida ochiladi; sayt foydalanuvchi ma'lumotini yubormaydi.
 */
export function GoogleMapEmbed({ query, zoom = 12, title }: { query: string; zoom?: number; title: string }) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&hl=uz&z=${zoom}&output=embed`;
  return (
    <div className="overflow-hidden rounded-card border border-border bg-bg-soft">
      <iframe
        src={src}
        title={title}
        className="block h-[360px] w-full sm:h-[460px]"
        style={{ border: 0 }}
        loading="eager"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
