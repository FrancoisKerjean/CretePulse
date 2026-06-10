// Bloc comparatif bus vs taxi + slot partenaire sponsorise.
// Non-async, zero I/O : utilise sur les pages paires (server) et dans le
// planificateur (client). Les donnees partenaires arrivent en props (JSON
// importe aux points d'usage).
// Spec : docs/superpowers/specs/2026-06-10-taxi-partners-design.md
import { CarTaxiFront, ExternalLink } from "lucide-react";
import Link from "next/link";
import { taxiFareRange } from "@/lib/taxi-fare";
import { partnerForPair, type TaxiPartnersData } from "@/lib/taxi-partners";
import type { Locale } from "@/lib/types";
import { TaxiCallButton } from "./TaxiCallButton";

const T = {
  title: { en: "By taxi", fr: "En taxi", de: "Mit dem Taxi", el: "Με ταξί" },
  method: {
    en: "Estimate at the official meter rate. Agree the fare before departure.",
    fr: "Estimation au compteur, tarif officiel. Convenez du prix avant le départ.",
    de: "Schätzung zum offiziellen Taxameter-Tarif. Preis vor Abfahrt vereinbaren.",
    el: "Εκτίμηση με το επίσημο ταξίμετρο. Συμφωνήστε την τιμή πριν την αναχώρηση.",
  },
  vsBus: {
    en: (p: string) => `Bus from ${p}`,
    fr: (p: string) => `Bus à partir de ${p}`,
    de: (p: string) => `Bus ab ${p}`,
    el: (p: string) => `Λεωφορείο από ${p}`,
  },
  sponsored: { en: "Sponsored", fr: "Sponsorisé", de: "Gesponsert", el: "Χορηγία" },
  inbound: {
    en: "Run a taxi in this area? Get this spot →",
    fr: "Vous exploitez un taxi dans la région ? Réservez cet emplacement →",
    de: "Sie fahren Taxi in dieser Region? Diesen Platz sichern →",
    el: "Έχετε ταξί στην περιοχή; Αποκτήστε αυτή τη θέση →",
  },
} as const;

export function TaxiCompare({ locale, slugA, slugB, pairSlug, busPriceEur, partnersData, compact }: {
  locale: Locale;
  slugA: string;
  slugB: string;
  pairSlug: string;
  busPriceEur: number | null;
  partnersData: TaxiPartnersData;
  compact?: boolean;
}) {
  const fare = taxiFareRange(slugA, slugB);
  if (!fare) return null;
  const partner = partnerForPair(partnersData, slugA, slugB);

  return (
    <section className={`rounded-xl border border-border bg-white ${compact ? "p-4 mt-4" : "p-5 mb-8"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <h2 className="text-base font-semibold text-text flex items-center gap-2 m-0">
          <CarTaxiFront className="w-5 h-5 text-aegean" /> {T.title[locale]} :{" "}
          {fare.low}–{fare.high} € · ~{fare.km} km
        </h2>
        {busPriceEur != null && (
          <span className="text-sm text-text-muted">
            {T.vsBus[locale](`${busPriceEur.toFixed(2)} €`)}
          </span>
        )}
      </div>
      <p className="text-xs text-text-muted mb-0">{T.method[locale]}</p>

      {partner ? (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider font-semibold bg-amber-100 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5">
            {T.sponsored[locale]}
          </span>
          <span className="text-sm font-semibold text-text">{partner.name}</span>
          <TaxiCallButton phone={partner.phone} zone={partner.zone.id} pair={pairSlug} partner={partner.name} />
          {partner.website && (
            <a href={partner.website} target="_blank" rel="nofollow noopener sponsored"
               className="text-sm text-aegean hover:underline inline-flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> {new URL(partner.website).hostname}
            </a>
          )}
        </div>
      ) : (
        <p className="mt-3 pt-3 border-t border-border mb-0">
          <Link href={`/${locale}/partners`} className="text-xs text-text-muted hover:text-aegean hover:underline">
            {T.inbound[locale]}
          </Link>
        </p>
      )}
    </section>
  );
}
