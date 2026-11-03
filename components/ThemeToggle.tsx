"use client";

import { useState } from "react";

export type Theme = "koinot" | "sodda";

export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function choose(next: Theme) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", next === "koinot" ? "#060816" : "#ffffff");
  }

  return (
    <div
      role="radiogroup"
      aria-label="Mavzu"
      className="flex shrink-0 items-center rounded-full border border-border bg-surface-2 p-0.5 text-xs font-semibold"
    >
      {(
        [
          ["koinot", "Koinot", "✦"],
          ["sodda", "Sodda", "○"],
        ] as const
      ).map(([value, label, icon]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => choose(value)}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 transition-colors sm:px-3 ${
            theme === value ? "bg-accent text-accent-contrast" : "text-muted hover:text-text"
          }`}
        >
          <span aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
