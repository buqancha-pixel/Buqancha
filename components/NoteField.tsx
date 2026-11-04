"use client";

import { useState } from "react";

const MAX_WORDS = 500;

/** Tavsiya matni: so'z hisoblagichi bilan (500 so'zgacha). */
export function NoteField({ defaultValue = "", rows = 3, placeholder = "Tavsiya: nega o'qish kerak, kimga yoqadi (500 so'zgacha, ixtiyoriy)" }: { defaultValue?: string; rows?: number; placeholder?: string }) {
  const [text, setText] = useState(defaultValue);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const over = words > MAX_WORDS;
  return (
    <div className="grid min-w-0 flex-1 basis-full gap-1">
      <textarea
        name="note"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={rows}
        maxLength={4000}
        placeholder={placeholder}
        aria-label="Tavsiya matni"
        className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm leading-relaxed"
      />
      <span className={`text-right text-[11px] tabular ${over ? "font-semibold text-red-500" : "text-muted"}`}>
        {words} / {MAX_WORDS} so&apos;z
      </span>
    </div>
  );
}
