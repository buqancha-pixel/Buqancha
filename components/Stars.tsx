/** 1–5 yulduz baho (faqat ko'rsatish). */
export function Stars({ value, className = "" }: { value: number | null | undefined; className?: string }) {
  if (!value) return null;
  const v = Math.max(1, Math.min(5, Math.round(value)));
  return (
    <span className={`tracking-tight text-[#f5b301] ${className}`} aria-label={`${v} / 5 baho`} title={`${v} / 5`}>
      {"★".repeat(v)}
      <span className="text-muted/40">{"★".repeat(5 - v)}</span>
    </span>
  );
}
