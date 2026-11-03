export function SampleNotice({ className = "" }: { className?: string }) {
  return (
    <p role="note" className={`rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn-text ${className}`}>
      <strong>Diqqat:</strong> bu sahifadagi narxlar namunaviy — sotuvchilarning haqiqiy narxlari emas. Narxlarni
      avtomatik yig'ish keyingi bosqichda qo'shiladi.
    </p>
  );
}
