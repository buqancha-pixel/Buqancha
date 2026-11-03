export function SampleNotice({ all = true, className = "" }: { all?: boolean; className?: string }) {
  return (
    <p role="note" className={`rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn-text ${className}`}>
      <strong>Diqqat:</strong>{" "}
      {all
        ? "bu sahifadagi narxlar namunaviy — sotuvchilarning haqiqiy narxlari emas."
        : "«namunaviy narx» deb belgilangan takliflar haqiqiy narx emas — ular hali sotuvchidan yig'ilmagan."}
    </p>
  );
}
