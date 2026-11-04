"use client";

import { useTransition } from "react";

type Action = (data: FormData) => Promise<void>;

function call(action: Action, fields: Record<string, string>, start: (cb: () => void) => void) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  start(() => action(fd));
}

/** Bo'lim tanlanishi bilan saqlanadi (tugma bosish shart emas). */
export function QuickCategory({ bookId, back, options, action }: { bookId: string; back: string; options: Array<{ slug: string; name: string }>; action: Action }) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Bo'limga qo'shish"
      defaultValue=""
      disabled={pending}
      onChange={(e) => e.target.value && call(action, { quick: `${bookId}|${e.target.value}`, back }, start)}
      className="h-9 max-w-44 rounded-full border border-border bg-surface-2 px-3 text-xs disabled:opacity-50"
    >
      <option value="">{pending ? "Saqlanmoqda…" : "+ Bo'limga qo'shish"}</option>
      {options.map((o) => (
        <option key={o.slug} value={o.slug}>{o.name}</option>
      ))}
    </select>
  );
}

/** Bo'lim yorlig'i: bosilsa — kitob shu bo'limdan olib tashlanadi. */
export function RemoveChip({ bookId, slug, name, back, action }: { bookId: string; slug: string; name: string; back: string; action: Action }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => call(action, { remove: `${bookId}|${slug}`, back }, start)}
      title="Bo'limdan olib tashlash"
      className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold hover:line-through disabled:opacity-50"
    >
      {name} ×
    </button>
  );
}

/** Ro'yxatdagi barcha belgilash katakchalarini yoqish/o'chirish. */
export function SelectAll() {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-5 w-5"
        onChange={(e) => {
          e.currentTarget.form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((c) => (c.checked = e.currentTarget.checked));
        }}
      />
      Hammasini belgilash
    </label>
  );
}
