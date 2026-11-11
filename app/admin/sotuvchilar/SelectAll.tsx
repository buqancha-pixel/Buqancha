"use client";

/** Ro'yxatdagi barcha sotuvchilarni belgilash / belgini olish. */
export function SelectAllSellers() {
  return (
    <label className="flex items-center gap-2 font-semibold">
      <input
        type="checkbox"
        className="h-5 w-5"
        onChange={(e) => {
          const form = e.currentTarget.form;
          form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((c) => (c.checked = e.currentTarget.checked));
        }}
      />
      Hammasini belgilash
    </label>
  );
}
