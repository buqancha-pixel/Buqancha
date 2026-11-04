"use client";

import { useState } from "react";

/** Nusxalanadigan matn (havola yoki tayyor xabar) va "Nusxalash" tugmasi. */
export function CopyBox({ text, rows = 1, label = "Nusxalash" }: { text: string; rows?: number; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // eski brauzerlar: matnni belgilab qo'yamiz — foydalanuvchi o'zi nusxalaydi
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <div className="grid gap-2">
      {rows > 1 ? (
        <textarea readOnly value={text} rows={rows} className="w-full rounded-lg border border-border bg-bg p-2 text-xs leading-relaxed" />
      ) : (
        <input readOnly value={text} className="h-10 w-full rounded-lg border border-border bg-bg px-2 font-mono text-xs" />
      )}
      <button type="button" onClick={copy} className="h-9 w-fit rounded-full bg-accent px-4 text-xs font-semibold text-accent-contrast">
        {done ? "✓ Nusxalandi" : label}
      </button>
    </div>
  );
}
