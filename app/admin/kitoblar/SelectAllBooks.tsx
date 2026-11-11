"use client";

/** Sahifadagi barcha kitoblarni belgilash / belgini olish. */
export function SelectAllBooks() {
  return (
    <label className="flex items-center gap-1.5 font-semibold">
      <input
        type="checkbox"
        className="h-4 w-4"
        onChange={(e) => {
          e.currentTarget.form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((c) => (c.checked = e.currentTarget.checked));
        }}
      />
      Hammasini belgilash
    </label>
  );
}
