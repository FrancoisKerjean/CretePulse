"use client";

import { useState } from "react";

const TITLES: Record<string, string> = {
  en: "Stay informed.",
  fr: "Restez informé.",
  de: "Bleiben Sie informiert.",
  el: "Μείνετε ενημερωμένοι.",
};

const SUBS: Record<string, string> = {
  en: "Get the weekly Crete briefing — news, weather, events. No spam.",
  fr: "Recevez la synthèse hebdomadaire de Crète : actualités, météo, événements. Pas de spam.",
  de: "Das wöchentliche Kreta-Briefing : Nachrichten, Wetter, Events. Kein Spam.",
  el: "Το εβδομαδιαίο ενημερωτικό για την Κρήτη : νέα, καιρός, εκδηλώσεις. Χωρίς spam.",
};

const CTAS: Record<string, string> = {
  en: "Subscribe",
  fr: "S'abonner",
  de: "Abonnieren",
  el: "Εγγραφή",
};

const SUCCESS: Record<string, string> = {
  en: "Thanks! Check your inbox to confirm.",
  fr: "Merci ! Vérifiez votre boîte pour confirmer.",
  de: "Danke! Bitte bestätigen Sie per E-Mail.",
  el: "Ευχαριστούμε! Ελέγξτε το email σας για επιβεβαίωση.",
};

const ERR: Record<string, string> = {
  en: "Something went wrong. Try again.",
  fr: "Une erreur est survenue. Réessayez.",
  de: "Etwas ist schiefgelaufen.",
  el: "Κάτι πήγε στραβά.",
};

export default function NewsletterCTA({ locale, variant = "card" }: { locale: string; variant?: "card" | "inline" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const t = (m: Record<string, string>) => m[locale] || m.en;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    try {
      const r = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      setStatus(r.ok ? "success" : "error");
      if (r.ok) setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className={`mt-14 rounded-2xl bg-aegean px-6 py-8 text-center text-white ${variant === "inline" ? "" : ""}`}>
        <p className="text-sm font-medium">{t(SUCCESS)}</p>
      </div>
    );
  }

  return (
    <div className="mt-14 rounded-2xl border border-aegean/20 bg-aegean-faint px-6 py-8 text-center">
      <div className="w-8 h-1 bg-terra rounded-full mx-auto mb-4" />
      <h3 className="text-lg font-bold text-aegean mb-2" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        {t(TITLES)}
      </h3>
      <p className="text-sm text-text-muted mb-5 max-w-sm mx-auto leading-relaxed">{t(SUBS)}</p>
      <form className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto" onSubmit={onSubmit}>
        <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          required
          className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-aegean/30 bg-white text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-aegean/40"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-5 py-2.5 text-sm font-semibold bg-aegean text-white rounded-lg hover:bg-aegean-light transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
        >
          {status === "loading" ? "…" : t(CTAS)}
        </button>
      </form>
      {status === "error" && <p className="text-xs text-red-500 mt-2">{t(ERR)}</p>}
    </div>
  );
}
