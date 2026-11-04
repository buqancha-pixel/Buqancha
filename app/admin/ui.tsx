import Link from "next/link";
import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";

export const inputCls =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-text outline-none placeholder:text-muted focus:border-accent";

export function Field({ label, hint, className = "", ...rest }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium">
        {label}
        {rest.required && " *"}
      </span>
      <input className={inputCls} {...rest} />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Area({ label, className = "", ...rest }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium">{label}</span>
      <textarea
        rows={4}
        className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-muted focus:border-accent"
        {...rest}
      />
    </label>
  );
}

export function Select({ label, children, className = "", ...rest }: { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium">
        {label}
        {rest.required && " *"}
      </span>
      <select className={inputCls} {...rest}>
        {children}
      </select>
    </label>
  );
}

export function Check({ label, ...rest }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" {...rest} />
      {label}
    </label>
  );
}

export function Button({ children, variant = "primary", className = "", ...rest }: { variant?: "primary" | "ghost" | "danger" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v =
    variant === "primary"
      ? "bg-accent text-accent-contrast hover:opacity-90"
      : variant === "danger"
        ? "border border-danger text-danger hover:bg-danger hover:text-white"
        : "border border-border bg-surface-2 hover:border-accent";
  return (
    <button type="submit" className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${v} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Flash({ sp }: { sp: { ok?: string; xato?: string } }) {
  if (sp.xato)
    return (
      <p role="alert" className="mb-4 rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn-text">
        {sp.xato}
      </p>
    );
  if (sp.ok)
    return (
      <p role="status" className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm">
        ✓ {sp.ok}
      </p>
    );
  return null;
}

export function PageTitle({ children, back }: { children: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-5">
      {back && (
        <Link href={back.href} className="text-sm text-muted hover:text-text">
          ← {back.label}
        </Link>
      )}
      <h1 className="mt-1 text-2xl sm:text-3xl">{children}</h1>
    </div>
  );
}

export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="card mb-5 scroll-mt-24 p-4 sm:p-6">
      <h2 className="mb-4 text-lg">{title}</h2>
      {children}
    </section>
  );
}

export type SP = Promise<Record<string, string | undefined>>;
