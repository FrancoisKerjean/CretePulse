"use client";

// Capture d'intention van partage (lot 1) : email + date + nb passagers sur
// paires sans bus direct (0 trajet ou uniquement en correspondance). Aucun
// email envoye en v1 ; le concierge se declenche au seuil (~4/paire/sem).
// Anti-abus cote route API (honeypot + ip_hash + rate-limit).
import { useState } from "react";
import { Users, Mail, Calendar, Check } from "lucide-react";
import type { Locale } from "@/lib/types";

const T: Record<string, Record<Locale, string>> = {
  title: {
    en: "No bus? Join a shared van for this trip",
    fr: "Pas de bus ? Rejoignez une navette partagée pour ce trajet",
    de: "Kein Bus? Steigen Sie in einen geteilten Van für diese Strecke ein",
    el: "Χωρίς λεωφορείο; Συμμετέχετε σε κοινόχρηστο βαν για αυτή τη διαδρομή",
  },
  titleIndirect: {
    en: "Skip the change: join a shared van for this trip",
    fr: "Évitez la correspondance : rejoignez une navette partagée",
    de: "Ohne Umstieg: geteilter Van für diese Strecke",
    el: "Χωρίς αλλαγή: κοινόχρηστο βαν για αυτή τη διαδρομή",
  },
  titleRoute: {
    en: "Travelling as a group? Share a private van on this route",
    fr: "Vous voyagez à plusieurs ? Partagez un van privé sur ce trajet",
    de: "Als Gruppe unterwegs? Teilen Sie einen privaten Van auf dieser Strecke",
    el: "Ταξιδεύετε παρέα; Μοιραστείτε ιδιωτικό βαν σε αυτή τη διαδρομή",
  },
  lead: {
    en: "We regroup travellers on the same route to share a licensed minivan. Leave your email, we come back only when a group is forming.",
    fr: "Nous regroupons les voyageurs sur le même trajet pour partager un minibus licencié. Laissez votre email, nous vous recontactons uniquement quand un groupe se forme.",
    de: "Wir bündeln Reisende auf derselben Strecke, um einen lizenzierten Minivan zu teilen. Hinterlassen Sie Ihre E-Mail, wir melden uns nur, wenn eine Gruppe zustande kommt.",
    el: "Ομαδοποιούμε ταξιδιώτες στην ίδια διαδρομή για κοινόχρηστο αδειοδοτημένο μίνι βαν. Αφήστε το email σας, επικοινωνούμε μόνο όταν σχηματίζεται ομάδα.",
  },
  email: {
    en: "Your email", fr: "Votre email", de: "Ihre E-Mail", el: "Το email σας",
  },
  date: {
    en: "Travel date", fr: "Date du trajet", de: "Reisedatum", el: "Ημερομηνία ταξιδιού",
  },
  pax: {
    en: "Passengers", fr: "Passagers", de: "Personen", el: "Επιβάτες",
  },
  submit: {
    en: "Join the shared van", fr: "Rejoindre la navette",
    de: "Am geteilten Van teilnehmen", el: "Συμμετοχή στο κοινόχρηστο βαν",
  },
  sending: {
    en: "Sending…", fr: "Envoi…", de: "Senden…", el: "Αποστολή…",
  },
  ok: {
    en: "Got it. We'll reach out only when a group is forming on this route.",
    fr: "C'est noté. Nous vous recontactons uniquement quand un groupe se forme sur ce trajet.",
    de: "Gespeichert. Wir melden uns nur, wenn sich eine Gruppe für diese Strecke bildet.",
    el: "Καταγράφηκε. Θα επικοινωνήσουμε μόνο όταν σχηματιστεί ομάδα για αυτή τη διαδρομή.",
  },
  err: {
    en: "Could not send. Try again later.",
    fr: "Envoi impossible. Réessayez plus tard.",
    de: "Senden nicht möglich. Bitte später erneut versuchen.",
    el: "Αδυναμία αποστολής. Δοκιμάστε αργότερα.",
  },
  bookDirect: {
    en: "Or pick a route with seats already forming →",
    fr: "Ou choisissez un trajet avec des places déjà en formation →",
    de: "Oder wählen Sie eine Strecke mit Gruppen in Bildung →",
    el: "Ή επιλέξτε διαδρομή με ομάδες σε σχηματισμό →",
  },
  privacy: {
    en: "Email only, no phone required. Never shared.",
    fr: "Email uniquement, aucun téléphone. Jamais partagé.",
    de: "Nur E-Mail, keine Telefonnummer. Wird niemals weitergegeben.",
    el: "Μόνο email, χωρίς τηλέφωνο. Ποτέ δεν κοινοποιείται.",
  },
} as const;

function t(k: keyof typeof T, locale: Locale): string {
  return T[k][locale] ?? T[k].en;
}

export function VanInterest({
  locale,
  fromSlug,
  toSlug,
  fromPlace,
  toPlace,
  travelDate,
  bestChanges,
  source,
}: {
  locale: Locale;
  fromSlug: string;
  toSlug: string;
  fromPlace: string;
  toPlace: string;
  travelDate?: string;
  /** 0 = paire non desservie ; >=1 = uniquement en correspondance. */
  bestChanges: number;
  source: "journey-no-route" | "journey-indirect" | "route-page";
}) {
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(travelDate ?? "");
  const [pax, setPax] = useState(1);
  const [hp, setHp] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending" || status === "ok") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/buses/van-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          from_slug: fromSlug,
          to_slug: toSlug,
          from_place: fromPlace,
          to_place: toPlace,
          travel_date: date,
          pax,
          customer_email: email,
          source,
          best_changes: bestChanges,
          website: hp,
        }),
      });
      if (!res.ok) throw new Error("bad status");
      const plausible = (window as unknown as {
        plausible?: (e: string, o?: { props?: Record<string, string | number> }) => void;
      }).plausible;
      plausible?.("van_interest", {
        props: {
          from: fromSlug,
          to: toSlug,
          source,
          pax,
        },
      });
      setStatus("ok");
    } catch {
      setStatus("err");
    }
  }

  const titleKey: keyof typeof T =
    source === "journey-indirect" ? "titleIndirect"
    : source === "route-page" ? "titleRoute"
    : "title";

  if (status === "ok") {
    return (
      <div className="mt-4 rounded-3xl border border-lagoon/30 bg-lagoon/5 p-4 flex items-start gap-3">
        <Check className="w-5 h-5 text-lagoon-deep shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm text-text m-0">{t("ok", locale)}</p>
          <a
            href={`https://van.crete.direct/${locale}?from=${encodeURIComponent(fromSlug)}&to=${encodeURIComponent(toSlug)}&date=${encodeURIComponent(date)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              const plausible = (window as unknown as {
                plausible?: (e: string, o?: { props?: Record<string, string | number> }) => void;
              }).plausible;
              plausible?.("van_offer_click", { props: { from: fromSlug, to: toSlug, source } });
            }}
            className="block text-xs font-bold text-lagoon-deep hover:underline"
          >
            {t("bookDirect", locale)}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 rounded-3xl border border-lagoon/30 bg-lagoon/5 p-4 space-y-3"
    >
      <div>
        <p className="font-heading font-bold text-sm text-text m-0">{t(titleKey, locale)}</p>
        <p className="text-xs text-text-muted mt-1 mb-0">{t("lead", locale)}</p>
      </div>

      {/* Honeypot : cache aux humains, rempli par les bots. */}
      <input
        type="text"
        name="website"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] w-px h-px opacity-0"
      />

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-stretch">
        <label className="flex items-center gap-2 bg-white border border-border rounded-full px-3 py-2 text-sm">
          <Mail className="w-4 h-4 text-text-muted shrink-0" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("email", locale)}
            aria-label={t("email", locale)}
            className="flex-1 min-w-0 outline-none bg-transparent"
          />
        </label>
        <label className="flex items-center gap-2 bg-white border border-border rounded-full px-3 py-2 text-sm">
          <Calendar className="w-4 h-4 text-text-muted shrink-0" />
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label={t("date", locale)}
            className="outline-none bg-transparent font-data"
          />
        </label>
        <label className="flex items-center gap-2 bg-white border border-border rounded-full px-3 py-2 text-sm">
          <Users className="w-4 h-4 text-text-muted shrink-0" />
          <input
            type="number"
            min={1}
            max={8}
            required
            value={pax}
            onChange={(e) => setPax(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
            aria-label={t("pax", locale)}
            className="w-14 outline-none bg-transparent font-data"
          />
        </label>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-full bg-night text-white px-4 py-2.5 text-sm font-bold hover:bg-night/90 transition-colors disabled:opacity-60"
        >
          {status === "sending" ? t("sending", locale) : t("submit", locale)}
        </button>
        <span className="text-[11px] text-text-muted">{t("privacy", locale)}</span>
      </div>

      <a
        href={`https://van.crete.direct/${locale}?from=${encodeURIComponent(fromSlug)}&to=${encodeURIComponent(toSlug)}&date=${encodeURIComponent(date)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          const plausible = (window as unknown as {
            plausible?: (e: string, o?: { props?: Record<string, string | number> }) => void;
          }).plausible;
          plausible?.("van_offer_click", { props: { from: fromSlug, to: toSlug, source } });
        }}
        className="block text-xs font-bold text-lagoon-deep hover:underline"
      >
        {t("bookDirect", locale)}
      </a>

      {status === "err" && (
        <p className="text-xs text-red-600 m-0">{t("err", locale)}</p>
      )}
    </form>
  );
}
