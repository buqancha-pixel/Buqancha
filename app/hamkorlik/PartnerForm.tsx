"use client";

import { useActionState } from "react";
import { submitApplication, type FormState } from "./actions";

const initial: FormState = { ok: false };

export function PartnerForm() {
  const [state, action, pending] = useActionState(submitApplication, initial);

  if (state.ok) {
    return (
      <div className="card p-6 text-center" role="status">
        <p className="text-3xl" aria-hidden="true">✓</p>
        <p className="mt-2 text-lg font-semibold">{state.message}</p>
      </div>
    );
  }

  const v = state.values ?? {};
  const err = state.errors ?? {};

  return (
    <form action={action} className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6" noValidate>
      {state.message && !state.ok && (
        <p role="alert" className="rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-text sm:col-span-2">
          {state.message}
        </p>
      )}
      <Field label="Tashkilot nomi" name="orgName" defaultValue={v.orgName} error={err.orgName} required className="sm:col-span-2" />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="type" className="text-sm font-medium">Turi *</label>
        <select
          id="type"
          name="type"
          defaultValue={v.type ?? ""}
          required
          aria-invalid={!!err.type}
          className="h-11 rounded-xl border border-border bg-surface-2 px-3 text-text outline-none focus:border-accent"
        >
          <option value="" disabled>Tanlang</option>
          <option value="STORE">Kitob do'koni</option>
          <option value="PUBLISHER">Nashriyot</option>
          <option value="MARKETPLACE">Marketpleys</option>
        </select>
        {err.type && <p className="text-xs text-danger">{err.type}</p>}
      </div>
      <Field label="Shahar" name="city" defaultValue={v.city} error={err.city} required placeholder="Toshkent" />
      <Field label="Sayt" name="website" defaultValue={v.website} error={err.website} placeholder="https://" type="url" className="sm:col-span-2" />
      <Field label="Mas'ul shaxs" name="contactName" defaultValue={v.contactName} error={err.contactName} required autoComplete="name" />
      <Field label="Telefon" name="phone" defaultValue={v.phone} error={err.phone} required type="tel" placeholder="+998 90 123 45 67" autoComplete="tel" />
      <Field label="Email" name="email" defaultValue={v.email} error={err.email} type="email" autoComplete="email" className="sm:col-span-2" />
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="message" className="text-sm font-medium">Qo'shimcha ma'lumot</label>
        <textarea
          id="message"
          name="message"
          rows={4}
          defaultValue={v.message}
          placeholder="Nechta kitob sotasiz, narxlarni qanday yuborishingiz mumkin (fayl, API, sayt)…"
          className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-muted focus:border-accent"
        />
        {err.message && <p className="text-xs text-danger">{err.message}</p>}
      </div>
      <div className="hidden" aria-hidden="true">
        <label>Sayt (bo'sh qoldiring)<input name="company_site" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-full bg-accent font-semibold text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-60 sm:col-span-2"
      >
        {pending ? "Yuborilmoqda…" : "Arizani yuborish"}
      </button>
    </form>
  );
}

function Field({
  label, name, error, required, className = "", ...rest
}: { label: string; name: string; error?: string; required?: boolean; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={name} className="text-sm font-medium">
        {label}{required && " *"}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-err` : undefined}
        className="h-11 rounded-xl border border-border bg-surface-2 px-3 text-text outline-none placeholder:text-muted focus:border-accent"
        {...rest}
      />
      {error && <p id={`${name}-err`} className="text-xs text-danger">{error}</p>}
    </div>
  );
}
