"use client";

import { useState } from "react";
import { CheckCircle2, Copy } from "lucide-react";
import { CATEGORIES, AREAS, AFFILIATE_DEFAULT_COMMISSION_PCT } from "@/lib/affiliate";

interface Success {
  link: string;
  code: string;
}

const AREA_LABELS: Record<string, string> = {
  heraklion: "Heraklion",
  chania: "Chania",
  rethymnon: "Rethymnon",
  lassithi: "Lassithi",
  other: "Other / island-wide",
};

export default function SignupForm() {
  const [category, setCategory] = useState("hotel");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      category: fd.get("category"),
      category_other: fd.get("category_other"),
      area: fd.get("area"),
      email: fd.get("email"),
      redirect_url: fd.get("redirect_url"),
      website: fd.get("website"), // honeypot
      accept: fd.get("accept") === "on",
    };
    try {
      const res = await fetch("/api/affiliate/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else if (data.link && data.code) {
        setSuccess({ link: data.link, code: data.code });
      }
      // (honeypot/neutral success returns no link/code → no success screen)
    } catch {
      setError("Network error, please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-[1.75rem] border border-lagoon/40 bg-white p-6 shadow-[0_12px_30px_rgba(11,94,120,.12)]">
        <h3 className="flex items-center gap-2 text-xl font-heading font-bold text-sea mb-3">
          <CheckCircle2 className="w-5 h-5 text-ok" /> Your affiliate link is ready
        </h3>
        <p className="text-sm text-text mb-2">Share-ready link (already live):</p>
        <div className="flex items-center gap-2 mb-4">
          <code className="flex-1 rounded-lg bg-surface px-3 py-2 text-sm text-text break-all">{success.link}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(success.link);
              setCopied(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-sea text-white px-3 py-2 text-sm hover:opacity-90"
          >
            <Copy className="w-4 h-4" /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-sm text-text mb-1">
          Promo code: <strong>{success.code}</strong>
        </p>
        <p className="text-sm text-text">
          That&apos;s it, you&apos;re live. You only pay {AFFILIATE_DEFAULT_COMMISSION_PCT}% on the bookings we send you, nothing otherwise.
          We just emailed you this link and how to use it. No call needed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[1.75rem] border border-border bg-white p-6 space-y-4 shadow-[0_12px_30px_rgba(11,94,120,.12)]">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div>
        <label className="block text-sm font-medium text-text mb-1">Business name</label>
        <input name="name" required maxLength={120}
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text focus:outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30 transition-colors" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text mb-1">Category</label>
          <select name="category" value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text focus:outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30 transition-colors">
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1">Area</label>
          <select name="area" className="w-full rounded-lg border border-border px-3 py-2 text-sm">
            {AREAS.map((a) => (
              <option key={a} value={a}>{AREA_LABELS[a]}</option>
            ))}
          </select>
        </div>
      </div>

      {category === "other" && (
        <div>
          <label className="block text-sm font-medium text-text mb-1">Tell us your activity</label>
          <input name="category_other" maxLength={120}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text focus:outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30 transition-colors" />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text mb-1">Contact email</label>
        <input name="email" type="email" required
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text focus:outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30 transition-colors" />
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1">Your booking URL</label>
        <input name="redirect_url" type="url" required placeholder="https://…"
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text focus:outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30 transition-colors" />
      </div>

      <label className="flex items-start gap-2 text-sm text-text">
        <input name="accept" type="checkbox" required className="mt-1" />
        <span>I agree to a {AFFILIATE_DEFAULT_COMMISSION_PCT}% commission on the bookings crete.direct refers to me. No setup fee, cancel anytime.</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting}
        className="inline-flex items-center gap-2 rounded-[17px] bg-sun text-text font-heading font-bold px-5 py-2.5 shadow-[0_10px_26px_rgba(11,94,120,.16)] hover:brightness-105 disabled:opacity-60 transition-all">
        {submitting ? "Creating your link…" : "Get my affiliate link"}
      </button>
    </form>
  );
}
