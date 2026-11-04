"use client";

/** "Ko'rib chiqish" ro'yxatidagi barcha katakchalarni belgilash (ular bulk-publish formasiga bog'langan). */
export function SelectAllPublish() {
  return (
    <label className="flex items-center gap-1.5 font-semibold">
      <input
        type="checkbox"
        className="h-4 w-4"
        onChange={(e) => {
          document.querySelectorAll<HTMLInputElement>('input[form="bulk-publish"][name="ids"]').forEach((c) => (c.checked = e.currentTarget.checked));
        }}
      />
      Sahifadagilarning hammasi
    </label>
  );
}
