"use client";

import { useEffect } from "react";
import { estimateCarPrice } from "@/lib/car-pricing";

type Plausible = (event: string, opts?: { props?: Record<string, string | number> }) => void;

// i18n inline 4 langues, fallback EN (meme pattern que CarRentalWizard).
const L: Record<
  string,
  { label: string; perDay: string; forDays: (n: number) => string; disclaimer: string }
> = {
  en: {
    label: "Indicative estimate",
    perDay: "/day",
    forDays: (n) => `for ${n} day${n > 1 ? "s" : ""}`,
    disclaimer: "final price confirmed by the agency",
  },
  fr: {
    label: "Estimation indicative",
    perDay: "/jour",
    forDays: (n) => `pour ${n} jour${n > 1 ? "s" : ""}`,
    disclaimer: "prix final confirmé par l'agence",
  },
  de: {
    label: "Unverbindliche Schätzung",
    perDay: "/Tag",
    forDays: (n) => `für ${n} Tag${n > 1 ? "e" : ""}`,
    disclaimer: "Endpreis von der Agentur bestätigt",
  },
  el: {
    label: "Ενδεικτική εκτίμηση",
    perDay: "/ημέρα",
    forDays: (n) => `για ${n} ${n > 1 ? "ημέρες" : "ημέρα"}`,
    disclaimer: "η τελική τιμή επιβεβαιώνεται από το γραφείο",
  },
};

/**
 * Estimation de prix affichee AVANT l'ecran email (instrumentation 03/07) : donne
 * un ordre de grandeur pour lever la friction du wizard (26 arrivent a l'ecran
 * contact -> 2 soumettent). Grille indicative marche (cf lib/car-pricing.ts),
 * jamais un prix ferme -> disclaimer "prix final confirme par l'agence". Emet
 * `car_estimate_shown` pour mesurer l'effet sur le taux de soumission.
 */
export function CarPriceEstimate({
  carType,
  dateFrom,
  dateTo,
  timeFrom,
  timeTo,
  locale,
  placement = "wizard",
}: {
  carType: string;
  dateFrom: string;
  dateTo: string;
  timeFrom?: string | null;
  timeTo?: string | null;
  locale: string;
  placement?: string;
}) {
  const est = estimateCarPrice(carType, dateFrom, dateTo, timeFrom, timeTo);
  const l = L[locale] ?? L.en;
  const season = est?.season;
  const days = est?.days;

  useEffect(() => {
    if (!season || !days) return;
    (window as unknown as { plausible?: Plausible }).plausible?.("car_estimate_shown", {
      props: { carType, season, days: String(days), placement },
    });
  }, [carType, season, days, placement]);

  if (!est) return null;

  return (
    <div className="mt-6 rounded-2xl border-[1.5px] border-sea/25 bg-sea-faint px-4 py-3.5">
      <p className="m-0 text-[11px] uppercase tracking-[0.08em] font-bold text-sea">{l.label}</p>
      <p className="m-0 mt-1 font-heading font-extrabold text-[22px] leading-tight text-text">
        ≈ {est.totalLow} – {est.totalHigh} €
        <span className="ml-2 font-data text-[13px] font-semibold text-text-muted">
          {l.forDays(est.days)}
        </span>
      </p>
      <p className="m-0 mt-1 text-[13px] text-text-muted">
        <span className="font-data">
          ≈ {est.perDayLow} – {est.perDayHigh} €{l.perDay}
        </span>
        {" · "}
        {l.disclaimer}
      </p>
    </div>
  );
}
