"use client";
import { useState } from "react";
import type { ProCopy } from "@/lib/campagne-pro";

type Status = "idle" | "sending" | "sent" | "error";

export default function LeadForm({ locale, form, id }: { locale: string; form: ProCopy["form"]; id?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [values, setValues] = useState<Record<string, string>>({});
  const [hp, setHp] = useState("");

  const set = (n: string, v: string) => setValues((s) => ({ ...s, [n]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/projet-lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: form.variant === "institution" ? "institution" : "sponsor", locale, hp, ...values }),
      });
      const data = await res.json();
      setStatus(res.ok && data.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div id={id} className="w-full max-w-[560px] rounded-[24px] border-[3px] border-[var(--color-text)] bg-white p-[26px] text-center shadow-[0_7px_0_var(--color-text)]">
        <p className="font-[family-name:var(--font-heading)] text-[20px] font-extrabold text-[var(--color-text)]">{form.sent}</p>
      </div>
    );
  }

  return (
    <form id={id} onSubmit={onSubmit} className="w-full max-w-[560px] rounded-[24px] border-[3px] border-[var(--color-text)] bg-white p-[26px] shadow-[0_7px_0_var(--color-text)]">
      <h2 className="text-center font-[family-name:var(--font-heading)] text-[24px] font-extrabold text-[var(--color-text)]">{form.title}</h2>
      <p className="mb-4 mt-1 text-center text-[14px] text-[var(--color-muted,#56707d)]">{form.lead}</p>
      {/* honeypot cache */}
      <input type="text" name="hp" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden={true} className="hidden" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {form.fields.filter((f) => f.type !== "textarea").map((f) => (
          <div key={f.name}>
            <label htmlFor={`lf-${f.name}`} className="mb-[5px] block font-[family-name:var(--font-heading)] text-[12.5px] font-bold text-[var(--color-text)]">{f.label}</label>
            <input
              id={`lf-${f.name}`} type={f.type ?? "text"} required={f.required} placeholder={f.placeholder}
              value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)}
              className="w-full rounded-[13px] border-[2.5px] border-[var(--color-text)] bg-[#F6FBFC] px-[13px] py-[11px] text-[14.5px] text-[var(--color-text)] outline-none focus:border-lagoon"
            />
          </div>
        ))}
      </div>
      {form.fields.filter((f) => f.type === "textarea").map((f) => (
        <div key={f.name} className="mt-3">
          <label htmlFor={`lf-${f.name}`} className="mb-[5px] block font-[family-name:var(--font-heading)] text-[12.5px] font-bold text-[var(--color-text)]">{f.label}</label>
          <textarea
            id={`lf-${f.name}`} placeholder={f.placeholder} value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)}
            className="min-h-[84px] w-full resize-y rounded-[13px] border-[2.5px] border-[var(--color-text)] bg-[#F6FBFC] px-[13px] py-[11px] text-[14.5px] text-[var(--color-text)] outline-none focus:border-lagoon"
          />
        </div>
      ))}
      <button type="submit" disabled={status === "sending"} className="mt-4 w-full rounded-full border-[3px] border-[var(--color-text)] bg-lagoon py-[14px] font-[family-name:var(--font-heading)] text-[16px] font-extrabold text-white shadow-[0_5px_0_var(--color-text)] disabled:opacity-60">
        {status === "sending" ? form.sending : form.submit}
      </button>
      {status === "error" && <p className="mt-3 text-center text-[13px] font-semibold text-terracotta">{form.error}</p>}
    </form>
  );
}
