"use client";

import { useState } from "react";

/** Matn maydoni so'z hisoblagichi bilan (sukut — tavsiya, 500 so'zgacha; maqola uchun 3000). */
export function NoteField({
  defaultValue = "",
  rows = 3,
  placeholder = "Tavsiya: nega o'qish kerak, kimga yoqadi (500 so'zgacha, ixtiyoriy)",
  name = "note",
  maxWords: MAX_WORDS = 500,
  maxChars = 4000,
  label = "Tavsiya matni",
}: { defaultValue?: string; rows?: number; placeholder?: string; name?: string; maxWords?: number; maxChars?: number; label?: string }) {
  const [text, setText] = useState(defaultValue);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const over = words > MAX_WORDS;
  return (
    <div className="grid min-w-0 flex-1 basis-full gap-1">
      <textarea
        name={name}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={rows}
        maxLength={maxChars}
        placeholder={placeholder}
        aria-label={label}
        className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm leading-relaxed"
      />
      <span className={`text-right text-[11px] tabular ${over ? "font-semibold text-red-500" : "text-muted"}`}>
        {words} / {MAX_WORDS} so&apos;z
      </span>
    </div>
  );
}
