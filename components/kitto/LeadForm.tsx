"use client";

import { useState, type FormEvent } from "react";

// Open question in the PRD: final budget ranges. Placeholder values until Codifykit confirms.
const BUDGET_RANGES = ["Not sure yet", "Under ₹25k", "₹25k–₹1L", "₹1L–₹5L", "Above ₹5L"];

export interface LeadValues {
  name: string;
  email?: string;
  phone?: string;
  business?: string;
  need?: string;
  budgetRange?: string;
  consent: boolean;
}

export default function LeadForm({
  initialNeed,
  onSubmit,
}: {
  initialNeed: string;
  onSubmit: (values: LeadValues) => Promise<string | null>;
}) {
  const [values, setValues] = useState<LeadValues>({ name: "", need: initialNeed, consent: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof LeadValues) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) return setError("Your name, please.");
    if (!values.email?.trim() && !values.phone?.trim()) return setError("Add an email or a WhatsApp number.");
    if (!values.consent) return setError("Tick the box so my humans can contact you.");
    setBusy(true);
    setError(await onSubmit(values));
    setBusy(false);
  }

  const field =
    "w-full rounded-xl bg-[var(--kitto-paper)] px-3 py-2.5 text-[14px] text-[var(--kitto-ink)] ring-1 ring-black/[0.06] focus:bg-white focus:ring-2 focus:ring-[var(--kitto-lav)] focus:outline-none";

  return (
    <form onSubmit={submit} className="mx-4 mb-3 ml-[60px] flex flex-col gap-2 rounded-[22px] bg-white p-4 text-[14px] shadow-[0_8px_24px_-12px_rgba(27,21,48,0.3)] ring-1 ring-[var(--kitto-lav)]">
      <p className="text-[15px] font-extrabold text-[var(--kitto-ink)]">👋 Talk to my humans</p>
      <label className="sr-only" htmlFor="lead-name">Name</label>
      <input id="lead-name" className={field} placeholder="Name *" autoComplete="name" value={values.name} onChange={set("name")} />
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="lead-email">Email</label>
        <input id="lead-email" className={field} type="email" placeholder="Email" autoComplete="email" value={values.email ?? ""} onChange={set("email")} />
        <label className="sr-only" htmlFor="lead-phone">WhatsApp number</label>
        <input id="lead-phone" className={field} type="tel" placeholder="WhatsApp" autoComplete="tel" value={values.phone ?? ""} onChange={set("phone")} />
      </div>
      <label className="sr-only" htmlFor="lead-business">Business or brand name</label>
      <input id="lead-business" className={field} placeholder="Business or brand name" value={values.business ?? ""} onChange={set("business")} />
      <label className="sr-only" htmlFor="lead-need">What you need</label>
      <textarea id="lead-need" className={`${field} resize-none`} rows={2} placeholder="What you need" value={values.need ?? ""} onChange={set("need")} />
      <label className="sr-only" htmlFor="lead-budget">Budget range</label>
      <select id="lead-budget" className={field} value={values.budgetRange ?? ""} onChange={set("budgetRange")}>
        <option value="">Budget range (optional)</option>
        {BUDGET_RANGES.map((b) => (
          <option key={b}>{b}</option>
        ))}
      </select>
      <label className="flex items-start gap-2 text-[13px] text-zinc-700">
        <input
          type="checkbox"
          className="mt-0.5 accent-[var(--kitto-violet)]"
          checked={values.consent}
          onChange={(e) => setValues((v) => ({ ...v, consent: e.target.checked }))}
        />
        Codifykit can contact me about this.
      </label>
      {error && <p className="text-[13px] text-red-700" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-[var(--kitto-ink)] py-2.5 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kitto-violet)] disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send to the team"}
      </button>
    </form>
  );
}
