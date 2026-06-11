"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const COOKIE_NAME = "cd_nlbar_dismissed";
const COOKIE_DAYS = 30;

const COPY: Record<string, { hook: string; cta: string; placeholder: string; success: string }> = {
  en: {
    hook: "Weekly Crete briefing · news, weather, events. Free.",
    cta: "Subscribe",
    placeholder: "you@email.com",
    success: "Check your inbox to confirm.",
  },
  fr: {
    hook: "Briefing hebdo Crète · actus, météo, événements. Gratuit.",
    cta: "S'inscrire",
    placeholder: "vous@email.com",
    success: "Vérifiez votre boîte pour confirmer.",
  },
  de: {
    hook: "Wöchentliches Kreta-Briefing · Nachrichten, Wetter, Events. Kostenlos.",
    cta: "Abonnieren",
    placeholder: "sie@email.com",
    success: "Bitte bestätigen Sie per E-Mail.",
  },
  el: {
    hook: "Εβδομαδιαίο ενημερωτικό για την Κρήτη · νέα, καιρός, εκδηλώσεις. Δωρεάν.",
    cta: "Εγγραφή",
    placeholder: "you@email.com",
    success: "Ελέγξτε το email σας.",
  },
};

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const exp = new Date();
  exp.setTime(exp.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${exp.toUTCString()};path=/;SameSite=Lax`;
}

export default function StickyNewsletterBar({ locale }: { locale: string }) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const t = COPY[locale] || COPY.en;

  useEffect(() => {
    if (getCookie(COOKIE_NAME)) return;

    let triggered = false;
    const check = () => {
      if (triggered) return;
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const max = (doc.scrollHeight || 0) - window.innerHeight;
      if (max <= 0) return;
      const pct = (scrollTop / max) * 100;
      if (pct >= 70) {
        triggered = true;
        setVisible(true);
        window.removeEventListener("scroll", check);
      }
    };
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  function dismiss() {
    setCookie(COOKIE_NAME, "1", COOKIE_DAYS);
    setVisible(false);
  }

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
      if (r.ok) {
        setStatus("success");
        setCookie(COOKIE_NAME, "subscribed", 365);
        setTimeout(() => setVisible(false), 2500);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Newsletter"
      className="fixed bottom-0 left-0 right-0 z-40 bg-aegean text-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
      style={{ animation: "cdNlSlideUp 0.3s ease-out both" }}
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <p className="text-sm font-medium flex-1 min-w-0">
          {status === "success" ? t.success : t.hook}
        </p>

        {status !== "success" && (
          <form onSubmit={onSubmit} className="flex gap-2 flex-1 sm:flex-none sm:w-auto min-w-0">
            <input
              type="text"
              name="website"
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.placeholder}
              aria-label="Email"
              className="flex-1 sm:w-56 px-3 py-2 text-sm rounded-md text-text bg-white placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-terra"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="px-4 py-2 text-sm font-semibold bg-terra text-white rounded-md hover:bg-terra/90 transition-colors whitespace-nowrap disabled:opacity-60"
            >
              {status === "loading" ? "…" : t.cta}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <style>{`@keyframes cdNlSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}
