// Bloc comparatif bus vs taxi + slot partenaire sponsorise.
// Non-async, zero I/O : utilise sur les pages paires (server) et dans le
// planificateur (client). Les donnees partenaires arrivent en props (JSON
// importe aux points d'usage).
// Spec : docs/superpowers/specs/2026-06-10-taxi-partners-design.md
import { ExternalLink } from "lucide-react";
import { CiTaxi } from "@/components/icons";
import Link from "next/link";
import { taxiFareRange } from "@/lib/taxi-fare";
import { partnerForPair, type TaxiPartnersData } from "@/lib/taxi-partners";
import type { Locale } from "@/lib/types";
import { TaxiCallButton } from "./TaxiCallButton";

const T = {
  title: { en: "And by taxi?", fr: "Et en taxi ?", de: "Und mit dem Taxi?", el: "Και με ταξί;" },
  method: {
    en: "Estimate at the official meter rate · agree the fare before departure.",
    fr: "Estimation au compteur officiel · convenez du prix avant le départ.",
    de: "Schätzung zum offiziellen Taxameter-Tarif · Preis vor Abfahrt vereinbaren.",
    el: "Εκτίμηση με το επίσημο ταξίμετρο · συμφωνήστε την τιμή πριν την αναχώρηση.",
  },
  vsBus: {
    en: (p: string) => `Bus from ${p}`,
    fr: (p: string) => `Bus à partir de ${p}`,
    de: (p: string) => `Bus ab ${p}`,
    el: (p: string) => `Λεωφορείο από ${p}`,
  },
  sponsored: { en: "Sponsored", fr: "Sponsorisé", de: "Gesponsert", el: "Χορηγία" },
  inbound: {
    en: "Run a taxi in this area? Get this spot",
    fr: "Vous exploitez un taxi dans la région ? Réservez cet emplacement",
    de: "Sie fahren Taxi in dieser Region? Diesen Platz sichern",
    el: "Έχετε ταξί στην περιοχή; Αποκτήστε αυτή τη θέση",
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
    <section className={`rounded-[28px] bg-sand ${compact ? "px-5 py-4 mt-4" : "px-7 py-5 mb-8"}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="bg-sun rounded-[18px] w-[52px] h-[52px] flex items-center justify-center text-text shrink-0">
            <CiTaxi className="w-[26px] h-[26px]" />
          </span>
          <div>
            <h2 className="font-heading font-bold text-[19px] text-text m-0">{T.title[locale]}</h2>
            <p className="text-[13px] text-[#8A7340] m-0">{T.method[locale]}</p>
          </div>
        </div>
        <div className="text-[13px] text-[#8A7340] font-data">
          <b className="font-heading text-[22px] text-text">{fare.low}–{fare.high} €</b> · ~{fare.km} km
          {busPriceEur != null && <span className="block">{T.vsBus[locale](`${busPriceEur.toFixed(2)} €`)}</span>}
        </div>
      </div>

      {partner ? (
        <div className="mt-4 pt-3.5 border-t border-[#8A7340]/20 flex flex-wrap items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider font-bold bg-white/70 text-[#8A6A14] rounded-full px-2.5 py-1">
            {T.sponsored[locale]}
          </span>
          <span className="text-sm font-heading font-bold text-text">{partner.name}</span>
          <TaxiCallButton phone={partner.phone} zone={partner.zone.id} pair={pairSlug} partner={partner.name} />
          {partner.website && (
            <a href={partner.website} target="_blank" rel="nofollow noopener sponsored"
               className="text-sm text-sea hover:underline inline-flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> {new URL(partner.website).hostname}
            </a>
          )}
        </div>
      ) : (
        <p className="mt-4 pt-3.5 border-t border-[#8A7340]/20 mb-0">
          <Link href={`/${locale}/partners`}
                className="inline-flex bg-text text-white rounded-full px-5 py-2.5 text-[13.5px] font-heading font-bold no-underline hover:bg-night transition-colors">
            {T.inbound[locale]}
          </Link>
        </p>
      )}
    </section>
  );
}
