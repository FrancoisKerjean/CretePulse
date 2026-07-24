"use client";

import { useState } from "react";

/**
 * Share bar for the utility pages (buses, weather, where-to-swim...).
 * The dominant traffic channel is touristes-resharing-on-Facebook/WhatsApp
 * (Plausible 30j: /buses = 74% of traffic, mostly from FB + direct), so the
 * job here is to make that resharing one tap.
 *
 * Self-contained i18n (en/fr/de/el + en fallback) on purpose: the site's
 * messages/*.json are edited by other terminals; keeping labels local avoids
 * touching 22 files and any merge collision. WhatsApp/Facebook are brand
 * names, universal.
 */

type Loc = "en" | "fr" | "de" | "el";

const LABELS: Record<Loc, { prompt: string; share: string; copied: string; copy: string; aria: string }> = {
  en: { prompt: "Useful? Share it", share: "Share", copied: "Link copied", copy: "Copy link", aria: "Share this page" },
  fr: { prompt: "Utile ? Partagez", share: "Partager", copied: "Lien copié", copy: "Copier le lien", aria: "Partager cette page" },
  de: { prompt: "Nützlich? Teilen", share: "Teilen", copied: "Link kopiert", copy: "Link kopieren", aria: "Diese Seite teilen" },
  el: { prompt: "Χρήσιμο; Κοινοποιήστε", share: "Κοινοποίηση", copied: "Ο σύνδεσμος αντιγράφηκε", copy: "Αντιγραφή συνδέσμου", aria: "Κοινοποίηση σελίδας" },
};

const pickLoc = (l: string): Loc => (["en", "fr", "de", "el"].includes(l) ? (l as Loc) : "en");

function track(network: string, url: string) {
  if (typeof window === "undefined") return;
  (window as unknown as { plausible?: (e: string, o?: { props?: Record<string, string> }) => void })
    .plausible?.("share", { props: { network, url } });
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M17.5 14.4c-.3-.15-1.7-.85-2-.95-.26-.1-.45-.15-.64.15-.19.28-.74.94-.9 1.13-.17.19-.33.21-.62.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.29-.02-.45.13-.6.13-.13.3-.34.44-.51.15-.17.2-.29.3-.48.1-.2.05-.36-.02-.5-.08-.15-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49-.17-.01-.36-.01-.55-.01-.19 0-.5.07-.77.36-.26.29-1 .98-1 2.38s1.03 2.76 1.17 2.95c.14.19 2.02 3.08 4.9 4.32.68.3 1.22.47 1.64.6.69.22 1.31.19 1.81.12.55-.08 1.7-.69 1.94-1.37.24-.67.24-1.25.17-1.37-.07-.12-.26-.19-.55-.34z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.13c-1.53 0-3.03-.41-4.34-1.19l-.31-.18-3.12.82.83-3.04-.2-.32a8.16 8.16 0 01-1.25-4.34c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.82c0 4.54-3.69 8.24-8.23 8.24z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M14.6 8.4h2.2V5.4h-2.6c-2.3 0-3.5 1.4-3.5 3.6v1.7H8.2v3.1h2.5V21h3.1v-7.2h2.2l.4-3.1h-2.6V9.3c0-.7.3-.9.9-.9Z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="17.5" cy="6" r="2.6" />
      <circle cx="17.5" cy="18" r="2.6" />
      <path d="M8.3 10.8 15.2 7.2M8.3 13.2l6.9 3.6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const PILL =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold no-underline transition-colors";

export function ShareBar({ url, title, locale, className = "" }: { url: string; title: string; locale: string; className?: string }) {
  const t = LABELS[pickLoc(locale)];
  const [copied, setCopied] = useState(false);

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
  const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  const onShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        track("native", url);
        return;
      } catch {
        /* user cancelled: fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track("copy", url);
    } catch {
      /* clipboard blocked: noop */
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`} aria-label={t.aria}>
      <span className="text-sm font-semibold text-text-muted mr-0.5">{t.prompt}</span>

      <a
        className={`${PILL} bg-[#25D366] text-white hover:brightness-105`}
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("whatsapp", url)}
      >
        <WhatsAppIcon /> WhatsApp
      </a>

      <a
        className={`${PILL} bg-[#1877F2] text-white hover:brightness-105`}
        href={fbHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("facebook", url)}
      >
        <FacebookIcon /> Facebook
      </a>

      <button
        type="button"
        className={`${PILL} bg-white text-text border border-border hover:bg-surface`}
        onClick={onShare}
      >
        {copied ? <CheckIcon /> : <ShareIcon />}
        {copied ? t.copied : t.share}
      </button>
    </div>
  );
}
