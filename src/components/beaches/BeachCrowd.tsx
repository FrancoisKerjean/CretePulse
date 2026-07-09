// Affichage de l'affluence estimée (badge) et des alternatives plus calmes
// (redistribution des flux) sur les pages plages. Composants purs : les
// données viennent de lib/beach-crowd (JSON précalculé), passées en props.
// Spec : docs/SPEC-BEACHES-DATA.md (lot 2)
import Link from "next/link";
import { Users } from "lucide-react";
import type { CrowdBand, CrowdScore, QuieterAlternative } from "@/lib/beach-crowd";
import { getLocalizedField, type Locale } from "@/lib/types";

const BAND_STYLES: Record<CrowdBand, string> = {
  quiet: "bg-emerald-50 text-emerald-800",
  moderate: "bg-amber-50 text-amber-800",
  busy: "bg-red-50 text-red-800",
};

const LABELS: Record<string, {
  band: Record<CrowdBand, string>;
  crowdLevel: string;
  quieterTitle: string;
  quieterIntro: string;
  away: (km: number) => string;
}> = {
  en: {
    band: { quiet: "usually quiet", moderate: "moderate crowds", busy: "usually busy" },
    crowdLevel: "Crowd level",
    quieterTitle: "Quieter alternatives nearby",
    quieterIntro: "Same region, notably lower estimated crowd pressure:",
    away: (km) => `${km} km away`,
  },
  fr: {
    band: { quiet: "généralement calme", moderate: "affluence modérée", busy: "généralement fréquentée" },
    crowdLevel: "Affluence",
    quieterTitle: "Alternatives plus calmes à proximité",
    quieterIntro: "Même région, pression de fréquentation estimée nettement plus faible :",
    away: (km) => `à ${km} km`,
  },
  de: {
    band: { quiet: "meist ruhig", moderate: "mäßig besucht", busy: "meist voll" },
    crowdLevel: "Andrang",
    quieterTitle: "Ruhigere Alternativen in der Nähe",
    quieterIntro: "Gleiche Region, deutlich geringerer geschätzter Andrang:",
    away: (km) => `${km} km entfernt`,
  },
  el: {
    band: { quiet: "συνήθως ήσυχη", moderate: "μέτρια κίνηση", busy: "συνήθως πολυσύχναστη" },
    crowdLevel: "Κοσμοσυρροή",
    quieterTitle: "Πιο ήσυχες εναλλακτικές κοντά",
    quieterIntro: "Ίδια περιοχή, αισθητά μικρότερη εκτιμώμενη κίνηση:",
    away: (km) => `${km} χλμ μακριά`,
  },
};

export function CrowdBadge({ crowd, locale }: { crowd: CrowdScore; locale: string }) {
  const L = LABELS[locale] ?? LABELS.en;
  return (
    <span className={`inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full ${BAND_STYLES[crowd.band]}`}>
      <Users className="w-4 h-4" /> {L.crowdLevel}: {L.band[crowd.band]}
    </span>
  );
}

export function QuieterAlternatives({
  alternatives,
  locale,
}: {
  alternatives: QuieterAlternative[];
  locale: string;
}) {
  if (alternatives.length === 0) return null;
  const L = LABELS[locale] ?? LABELS.en;
  return (
    <section className="mb-12">
      <h2 className="text-xl font-bold text-sea mb-2">{L.quieterTitle}</h2>
      <p className="text-sm text-text-muted mb-4">{L.quieterIntro}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {alternatives.map((a) => (
          <Link
            key={a.beach.slug}
            href={`/${locale}/beaches/${a.beach.slug}`}
            className="rounded-xl border border-border bg-white p-3 hover:border-sea/30 transition-all"
          >
            <p className="font-semibold text-sm">{getLocalizedField(a.beach, "name", locale as Locale)}</p>
            <p className="text-xs text-text-muted">{L.away(a.km)}</p>
            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-1 ${BAND_STYLES[a.crowd.band]}`}>
              {L.band[a.crowd.band]}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
