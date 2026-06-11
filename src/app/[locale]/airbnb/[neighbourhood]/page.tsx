import { ChevronLeft, MapPin, Home, Euro, Calendar, Star, Award, Shield, TrendingUp } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { BusAccessBox } from "@/components/BusAccessBox";
import { PromoBox } from "@/components/PromoBox";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CRETE_NEIGHBOURHOODS,
  REGION_LABEL,
  findNeighbourhood,
  type Loc,
} from "@/lib/airbnb-mappings";
import {
  getNeighbourhoodStats,
  getNeighbourhoodPropertyTypes,
  getCreteOverall,
  getSiblingNeighbourhoods,
  getRelatedGuides,
  type NeighbourhoodStats,
} from "@/lib/airbnb";
import { buildAlternates } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const SUPPORTED: Loc[] = ["en", "fr", "de", "el"];

const L: Record<Loc, {
  pageTitlePrefix: string;
  metaTitle: (n: string) => string;
  metaDesc: (n: string, count: number) => string;
  back: string;
  region: string;
  snapshot: string;
  overview: string;
  marketSize: string;
  listings: string;
  uniqueHosts: string;
  superhost: string;
  amaLicense: string;
  multiHost: string;
  pricing: string;
  avgPrice: string;
  medianPrice: string;
  priceRange: string;
  perNight: string;
  performance: string;
  occupancy: string;
  revenue: string;
  rating: string;
  daysPerYear: string;
  perYear: string;
  propertyTypes: string;
  typeName: string;
  typeCount: string;
  typePrice: string;
  typeRating: string;
  vsCrete: string;
  cretedAvg: string;
  newsHeader: string;
  noNews: string;
  otherAreas: string;
  inSameRegion: string;
  methodology: string;
  methodologyText: (snap: string) => string;
  caveat: string;
  caveatText: string;
  cta: string;
  ctaButton: string;
  ctaLink: string;
  dataPartner: string;
  distTitle: string;
  distCaption: (p25: string, p75: string, med: string) => string;
  medianShort: string;
  avgShort: string;
  creteShort: string;
  p95Short: string;
  occCompareTitle: string;
  creteLabel: string;
  insight: (name: string, price: Delta, occ: Delta, rev: Delta) => string;
}> = {
  en: {
    pageTitlePrefix: "Airbnb in",
    metaTitle: n => `Airbnb in ${n}, Crete: prices, occupancy, yields`,
    metaDesc: (n, c) =>
      `Inside Airbnb data for ${n}, Crete: ${c.toLocaleString("en")} listings analyzed. Average price, occupancy days per year, annual revenue, superhost share.`,
    back: "Back to Crete",
    region: "Region",
    snapshot: "Data snapshot",
    overview: "Market overview",
    marketSize: "Market size",
    listings: "Active listings",
    uniqueHosts: "Unique hosts",
    superhost: "Superhost share",
    amaLicense: "AMA license declared",
    multiHost: "Owned by multi-property hosts (3+)",
    pricing: "Pricing",
    avgPrice: "Average price",
    medianPrice: "Median price",
    priceRange: "Typical range (P25 - P75)",
    perNight: "per night",
    performance: "Performance",
    occupancy: "Average occupancy",
    revenue: "Estimated annual revenue",
    rating: "Average rating",
    daysPerYear: "days per year",
    perYear: "per year",
    propertyTypes: "Top property types",
    typeName: "Type",
    typeCount: "Listings",
    typePrice: "Avg price",
    typeRating: "Rating",
    vsCrete: "vs Crete-wide",
    cretedAvg: "Crete average",
    newsHeader: "Recent news affecting this area",
    noNews: "No recent published articles match this area yet.",
    otherAreas: "Other areas",
    inSameRegion: "In the same region",
    methodology: "About this data",
    methodologyText: snap =>
      `Figures come from the Inside Airbnb public dataset, snapshot dated ${snap}. They reflect the listings active on Airbnb at that date in this Greek municipality, not all short-term rentals on the island. Numbers are filtered to remove obvious outliers (prices below 30€ or above 2000€ per night).`,
    caveat: "Important caveat",
    caveatText:
      "Estimated occupancy and estimated revenue are computed by Inside Airbnb using a transparent methodology based on review velocity. They are good directional indicators but not a substitute for a calibrated yield analysis.",
    cta: "Considering buying or renting out a property here?",
    ctaButton: "Get a personal yield analysis",
    ctaLink: "https://kairosguest.com/rental-analyzer",
    dataPartner: "Data analysis and aggregation provided by",
    distTitle: "How nightly prices spread",
    distCaption: (p25, p75, med) =>
      `Half of all listings price between ${p25} and ${p75} a night; the median is ${med}.`,
    medianShort: "median",
    avgShort: "average",
    creteShort: "Crete avg",
    p95Short: "top 5% from",
    occCompareTitle: "Occupancy vs the rest of Crete",
    creteLabel: "Crete",
    insight: (name, price, occ, rev) => {
      const p = price.dir === 0
        ? `Nightly prices in ${name} are in line with the Crete average`
        : `Nightly prices in ${name} run ${price.pct}% ${price.dir > 0 ? "above" : "below"} the Crete average`;
      const o = occ.dir === 0
        ? `occupancy matches the island norm`
        : `listings fill ${occ.pct}% ${occ.dir > 0 ? "more" : "fewer"} nights than the island norm`;
      const r = rev.dir === 0
        ? `annual revenue per listing is close to the Crete average`
        : `the average listing grosses ${rev.pct}% ${rev.dir > 0 ? "more" : "less"} per year`;
      return `${p}; ${o}, and ${r}.`;
    },
  },
  fr: {
    pageTitlePrefix: "Airbnb à",
    metaTitle: n => `Airbnb à ${n}, Crète : prix, occupation, rendements`,
    metaDesc: (n, c) =>
      `Données Inside Airbnb pour ${n}, Crète : ${c.toLocaleString("fr")} annonces analysées. Prix moyen, jours d'occupation, revenu annuel, part de superhost.`,
    back: "Retour à la Crète",
    region: "Région",
    snapshot: "Données du",
    overview: "Vue d'ensemble du marché",
    marketSize: "Taille du marché",
    listings: "Annonces actives",
    uniqueHosts: "Hôtes uniques",
    superhost: "Part de superhost",
    amaLicense: "Licence AMA déclarée",
    multiHost: "Détenues par hôtes multi-biens (3+)",
    pricing: "Tarification",
    avgPrice: "Prix moyen",
    medianPrice: "Prix médian",
    priceRange: "Fourchette typique (P25 - P75)",
    perNight: "par nuit",
    performance: "Performance",
    occupancy: "Occupation moyenne",
    revenue: "Revenu annuel estimé",
    rating: "Note moyenne",
    daysPerYear: "jours par an",
    perYear: "par an",
    propertyTypes: "Types de biens dominants",
    typeName: "Type",
    typeCount: "Annonces",
    typePrice: "Prix moyen",
    typeRating: "Note",
    vsCrete: "vs Crète entière",
    cretedAvg: "Moyenne Crète",
    newsHeader: "Actualités récentes liées à cette zone",
    noNews: "Aucun article récent ne correspond encore à cette zone.",
    otherAreas: "Autres zones",
    inSameRegion: "Dans la même région",
    methodology: "À propos de ces données",
    methodologyText: snap =>
      `Les chiffres proviennent du jeu de données public Inside Airbnb, instantané du ${snap}. Ils reflètent les annonces actives sur Airbnb à cette date dans cette municipalité grecque, pas l'ensemble des locations courtes durées de l'île. Filtrage standard : prix entre 30€ et 2000€ par nuit.`,
    caveat: "Précision importante",
    caveatText:
      "L'occupation et le revenu annuel estimés sont calculés par Inside Airbnb selon une méthodologie transparente basée sur la vitesse d'arrivée des avis. Ce sont de bons indicateurs directionnels, pas un substitut à une analyse de rendement calibrée.",
    cta: "Vous envisagez d'acheter ou de mettre en location un bien ici ?",
    ctaButton: "Obtenir une analyse personnelle",
    ctaLink: "https://kairosguest.com/rental-analyzer",
    dataPartner: "Analyse et agrégation des données réalisées par",
    distTitle: "Comment les prix par nuit se répartissent",
    distCaption: (p25, p75, med) =>
      `La moitié des logements se situe entre ${p25} et ${p75} la nuit ; la médiane est à ${med}.`,
    medianShort: "médiane",
    avgShort: "moyenne",
    creteShort: "moy. Crète",
    p95Short: "top 5 % dès",
    occCompareTitle: "Occupation vs le reste de la Crète",
    creteLabel: "Crète",
    insight: (name, price, occ, rev) => {
      const p = price.dir === 0
        ? `Les prix par nuit à ${name} sont dans la moyenne crétoise`
        : `Les prix par nuit à ${name} sont ${price.pct}% ${price.dir > 0 ? "au-dessus" : "en dessous"} de la moyenne crétoise`;
      const o = occ.dir === 0
        ? `l'occupation est dans la norme de l'île`
        : `l'occupation est ${occ.pct}% ${occ.dir > 0 ? "au-dessus" : "en dessous"} de la norme de l'île`;
      const r = rev.dir === 0
        ? `le revenu annuel moyen par logement est proche de la moyenne`
        : `le revenu annuel moyen par logement est ${rev.pct}% plus ${rev.dir > 0 ? "élevé" : "bas"}`;
      return `${p} ; ${o}, et ${r}.`;
    },
  },
  de: {
    pageTitlePrefix: "Airbnb in",
    metaTitle: n => `Airbnb in ${n}, Kreta: Preise, Auslastung, Renditen`,
    metaDesc: (n, c) =>
      `Inside Airbnb Daten für ${n}, Kreta: ${c.toLocaleString("de")} Inserate analysiert. Durchschnittspreis, Belegungstage, Jahresumsatz, Superhost-Anteil.`,
    back: "Zurück nach Kreta",
    region: "Region",
    snapshot: "Datenstand",
    overview: "Marktübersicht",
    marketSize: "Marktgröße",
    listings: "Aktive Inserate",
    uniqueHosts: "Einzigartige Gastgeber",
    superhost: "Superhost-Anteil",
    amaLicense: "AMA-Lizenz angegeben",
    multiHost: "Im Besitz von Mehrfach-Gastgebern (3+)",
    pricing: "Preise",
    avgPrice: "Durchschnittspreis",
    medianPrice: "Median-Preis",
    priceRange: "Typischer Bereich (P25 - P75)",
    perNight: "pro Nacht",
    performance: "Performance",
    occupancy: "Durchschnittliche Auslastung",
    revenue: "Geschätzter Jahresumsatz",
    rating: "Durchschnittsbewertung",
    daysPerYear: "Tage pro Jahr",
    perYear: "pro Jahr",
    propertyTypes: "Wichtigste Objekttypen",
    typeName: "Typ",
    typeCount: "Inserate",
    typePrice: "Ø Preis",
    typeRating: "Bewertung",
    vsCrete: "vs gesamt Kreta",
    cretedAvg: "Kreta-Durchschnitt",
    newsHeader: "Aktuelle Nachrichten zu diesem Gebiet",
    noNews: "Noch keine aktuellen veröffentlichten Artikel zu diesem Gebiet.",
    otherAreas: "Andere Gebiete",
    inSameRegion: "In derselben Region",
    methodology: "Über diese Daten",
    methodologyText: snap =>
      `Die Zahlen stammen aus dem öffentlichen Inside Airbnb Datensatz, Stand ${snap}. Sie spiegeln die zu diesem Datum auf Airbnb aktiven Inserate in dieser griechischen Gemeinde wider, nicht alle Kurzzeitvermietungen der Insel.`,
    caveat: "Wichtiger Hinweis",
    caveatText:
      "Geschätzte Auslastung und Jahresumsatz werden von Inside Airbnb anhand der Bewertungsfrequenz berechnet. Sie sind gute Richtwerte, aber kein Ersatz für eine kalibrierte Renditeanalyse.",
    cta: "Erwägen Sie hier zu kaufen oder zu vermieten?",
    ctaButton: "Persönliche Renditeanalyse anfordern",
    ctaLink: "https://kairosguest.com/rental-analyzer",
    dataPartner: "Datenanalyse und Aggregation bereitgestellt von",
    distTitle: "So verteilen sich die Übernachtungspreise",
    distCaption: (p25, p75, med) =>
      `Die Hälfte aller Unterkünfte liegt zwischen ${p25} und ${p75} pro Nacht; der Median beträgt ${med}.`,
    medianShort: "Median",
    avgShort: "Durchschnitt",
    creteShort: "Kreta-Schnitt",
    p95Short: "Top 5 % ab",
    occCompareTitle: "Auslastung im Vergleich zum Rest Kretas",
    creteLabel: "Kreta",
    insight: (name, price, occ, rev) => {
      const p = price.dir === 0
        ? `Die Übernachtungspreise in ${name} liegen im kretischen Durchschnitt`
        : `Die Übernachtungspreise in ${name} liegen ${price.pct}% ${price.dir > 0 ? "über" : "unter"} dem kretischen Durchschnitt`;
      const o = occ.dir === 0
        ? `die Auslastung entspricht der Inselnorm`
        : `die Auslastung liegt ${occ.pct}% ${occ.dir > 0 ? "über" : "unter"} der Inselnorm`;
      const r = rev.dir === 0
        ? `der durchschnittliche Jahresumsatz pro Unterkunft liegt nahe am Durchschnitt`
        : `der durchschnittliche Jahresumsatz pro Unterkunft ist ${rev.pct}% ${rev.dir > 0 ? "höher" : "niedriger"}`;
      return `${p}; ${o}, und ${r}.`;
    },
  },
  el: {
    pageTitlePrefix: "Airbnb στ",
    metaTitle: n => `Airbnb στ ${n}, Κρήτη: τιμές, πληρότητα, αποδόσεις`,
    metaDesc: (n, c) =>
      `Δεδομένα Inside Airbnb για ${n}, Κρήτη: ${c.toLocaleString("el")} καταχωρήσεις. Μέση τιμή, ημέρες πληρότητας, ετήσιο έσοδο, ποσοστό superhost.`,
    back: "Επιστροφή στην Κρήτη",
    region: "Περιφέρεια",
    snapshot: "Στιγμιότυπο",
    overview: "Επισκόπηση αγοράς",
    marketSize: "Μέγεθος αγοράς",
    listings: "Ενεργές καταχωρήσεις",
    uniqueHosts: "Μοναδικοί οικοδεσπότες",
    superhost: "Ποσοστό superhost",
    amaLicense: "Δηλωμένη άδεια AMA",
    multiHost: "Από οικοδεσπότες με 3+ ακίνητα",
    pricing: "Τιμολόγηση",
    avgPrice: "Μέση τιμή",
    medianPrice: "Διάμεση τιμή",
    priceRange: "Τυπικό εύρος (P25 - P75)",
    perNight: "ανά διανυκτέρευση",
    performance: "Απόδοση",
    occupancy: "Μέση πληρότητα",
    revenue: "Εκτιμώμενο ετήσιο έσοδο",
    rating: "Μέση βαθμολογία",
    daysPerYear: "ημέρες ανά έτος",
    perYear: "ανά έτος",
    propertyTypes: "Κύριοι τύποι ακινήτων",
    typeName: "Τύπος",
    typeCount: "Καταχωρήσεις",
    typePrice: "Μέση τιμή",
    typeRating: "Βαθμολογία",
    vsCrete: "vs Κρήτη συνολικά",
    cretedAvg: "Μέσος όρος Κρήτης",
    newsHeader: "Πρόσφατα νέα για αυτή την περιοχή",
    noNews: "Δεν υπάρχουν πρόσφατα δημοσιευμένα άρθρα ακόμη.",
    otherAreas: "Άλλες περιοχές",
    inSameRegion: "Στην ίδια περιφέρεια",
    methodology: "Σχετικά με τα δεδομένα",
    methodologyText: snap =>
      `Τα στοιχεία προέρχονται από το δημόσιο σύνολο δεδομένων Inside Airbnb, στιγμιότυπο ${snap}.`,
    caveat: "Σημαντική επισήμανση",
    caveatText:
      "Η εκτιμώμενη πληρότητα και τα εκτιμώμενα έσοδα υπολογίζονται από το Inside Airbnb με βάση τη συχνότητα αξιολογήσεων. Είναι καλές ενδείξεις, όχι υποκατάστατο επαγγελματικής ανάλυσης απόδοσης.",
    cta: "Σκέφτεστε να αγοράσετε ή να εκμισθώσετε εδώ;",
    ctaButton: "Λάβετε προσωπική ανάλυση",
    ctaLink: "https://kairosguest.com/rental-analyzer",
    dataPartner: "Ανάλυση και συγκέντρωση δεδομένων από",
    distTitle: "Πώς κατανέμονται οι τιμές ανά διανυκτέρευση",
    distCaption: (p25, p75, med) =>
      `Τα μισά καταλύματα κοστίζουν μεταξύ ${p25} και ${p75} τη βραδιά· η διάμεσος είναι ${med}.`,
    medianShort: "διάμεσος",
    avgShort: "μέσος όρος",
    creteShort: "μ.ό. Κρήτης",
    p95Short: "top 5% από",
    occCompareTitle: "Πληρότητα σε σχέση με την υπόλοιπη Κρήτη",
    creteLabel: "Κρήτη",
    insight: (name, price, occ, rev) => {
      const p = price.dir === 0
        ? `Στην περιοχή ${name}, οι τιμές ανά διανυκτέρευση είναι κοντά στον μέσο όρο της Κρήτης`
        : `Στην περιοχή ${name}, οι τιμές ανά διανυκτέρευση είναι ${price.pct}% ${price.dir > 0 ? "πάνω από" : "κάτω από"} τον μέσο όρο της Κρήτης`;
      const o = occ.dir === 0
        ? `η πληρότητα είναι στον μέσο όρο του νησιού`
        : `η πληρότητα είναι ${occ.pct}% ${occ.dir > 0 ? "πάνω από" : "κάτω από"} τον μέσο όρο του νησιού`;
      const r = rev.dir === 0
        ? `και τα μέσα ετήσια έσοδα ανά κατάλυμα είναι κοντά στον μέσο όρο`
        : `και τα μέσα ετήσια έσοδα ανά κατάλυμα είναι ${rev.pct}% ${rev.dir > 0 ? "υψηλότερα" : "χαμηλότερα"}`;
      return `${p}· ${o}· ${r}.`;
    },
  },
};

/**
 * Type guard : the URL locale has a full UI translation (en/fr/de/el).
 * For other site locales (it/nl/ru/es/...) we still serve the page but
 * with English UI strings — the SEO benefit comes from indexing 22 × 24
 * pages with proper hreflang, not from re-translating the same UI 22 times.
 */
const VALID_LOC = (l: string): l is Loc =>
  (SUPPORTED as readonly string[]).includes(l);

/** Any locale routed by the site (22 languages from i18n/routing.ts). */
const VALID_SITE_LOC = (l: string): boolean =>
  (routing.locales as readonly string[]).includes(l);

/** Pick the closest UI locale we have translations for. */
function pickUiLoc(l: string): Loc {
  return VALID_LOC(l) ? l : "en";
}

function fmtNum(n: number | null | undefined, locale: string, digits = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  return n.toLocaleString(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function fmtEur(n: number | null | undefined, locale: string): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Signed comparison vs the Crete baseline; |delta| < 5% counts as "in line". */
type Delta = { pct: number; dir: -1 | 0 | 1 };

function computeDelta(value: number | null, baseline: number | null): Delta | null {
  if (value === null || baseline === null || baseline <= 0) return null;
  const raw = ((value - baseline) / baseline) * 100;
  if (!Number.isFinite(raw)) return null;
  const dir: Delta["dir"] = raw >= 5 ? 1 : raw <= -5 ? -1 : 0;
  return { pct: Math.abs(Math.round(raw)), dir };
}

/**
 * Server-rendered price spread: p25-p75 band, median + average markers,
 * p95 tick, Crete-average reference triangle. Pure SVG, no client JS.
 */
function PriceDistribution({
  stats, creteAvg, locale, t,
}: {
  stats: NeighbourhoodStats;
  creteAvg: number | null;
  locale: string;
  t: (typeof L)["en"];
}) {
  const { p25_price: p25, median_price: med, p75_price: p75, p95_price: p95, avg_price: avg } = stats;
  if (p25 === null || med === null || p75 === null) return null;

  const W = 680;
  const H = 134; // 3 label rows below the axis (p25/p75, average, Crete ref)
  const PAD = 36;
  const hi = Math.max(p95 ?? p75, avg ?? 0, creteAvg ?? 0) * 1.08;
  const lo = Math.max(0, p25 * 0.72);
  const x = (v: number) => PAD + ((v - lo) / (hi - lo)) * (W - 2 * PAD);
  const BAND_Y = 44;
  const BAND_H = 30;
  const eur = (v: number) => fmtEur(v, locale);

  return (
    <figure className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
      <figcaption className="text-sm font-medium text-stone-700 mb-1">{t.distTitle}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={t.distTitle}>
        {/* axis */}
        <line x1={PAD} x2={W - PAD} y1={BAND_Y + BAND_H / 2} y2={BAND_Y + BAND_H / 2} stroke="#d6d3d1" strokeWidth="1.5" />
        {/* p25-p75 band */}
        <rect
          x={x(p25)} y={BAND_Y} width={Math.max(2, x(p75) - x(p25))} height={BAND_H}
          rx="4" fill="#0e7490" fillOpacity="0.16" stroke="#0e7490" strokeOpacity="0.45"
        />
        <text x={x(p25)} y={BAND_Y + BAND_H + 16} textAnchor="middle" fontSize="11" fill="#57534e">{eur(p25)}</text>
        <text x={x(p75)} y={BAND_Y + BAND_H + 16} textAnchor="middle" fontSize="11" fill="#57534e">{eur(p75)}</text>
        {/* median */}
        <line x1={x(med)} x2={x(med)} y1={BAND_Y - 10} y2={BAND_Y + BAND_H + 4} stroke="#0e7490" strokeWidth="2.5" />
        <text x={x(med)} y={BAND_Y - 16} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#155e75">
          {eur(med)} · {t.medianShort}
        </text>
        {/* average (often pulled up by villas) */}
        {avg !== null && (
          <>
            <line x1={x(avg)} x2={x(avg)} y1={BAND_Y - 4} y2={BAND_Y + BAND_H + 4} stroke="#78716c" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x={x(avg)} y={BAND_Y + BAND_H + 30} textAnchor="middle" fontSize="10.5" fill="#78716c">
              {eur(avg)} · {t.avgShort}
            </text>
          </>
        )}
        {/* p95 tick */}
        {p95 !== null && (
          <>
            <line x1={x(p95)} x2={x(p95)} y1={BAND_Y + 6} y2={BAND_Y + BAND_H - 6} stroke="#a8a29e" strokeWidth="1.5" />
            <text x={x(p95)} y={BAND_Y - 2} textAnchor="middle" fontSize="10.5" fill="#a8a29e">
              {t.p95Short} {eur(p95)}
            </text>
          </>
        )}
        {/* Crete average reference */}
        {creteAvg !== null && (
          <>
            <path
              d={`M ${x(creteAvg)} ${BAND_Y + BAND_H + 36} l -5 8 l 10 0 z`}
              fill="#b45309"
            />
            <text x={x(creteAvg)} y={BAND_Y + BAND_H + 58} textAnchor="middle" fontSize="10.5" fill="#b45309">
              {t.creteShort} {eur(creteAvg)}
            </text>
          </>
        )}
      </svg>
      <p className="text-xs text-stone-500 mt-1">{t.distCaption(eur(p25), eur(p75), eur(med))}</p>
    </figure>
  );
}

/** Two-bar comparison of occupancy days vs the all-Crete average. */
function OccupancyCompare({
  areaName, areaDays, creteDays, locale, t,
}: {
  areaName: string;
  areaDays: number | null;
  creteDays: number | null;
  locale: string;
  t: (typeof L)["en"];
}) {
  if (areaDays === null || creteDays === null) return null;
  const max = Math.max(areaDays, creteDays) * 1.15;
  const w = (v: number) => `${Math.max(2, (v / max) * 100)}%`;
  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-sm font-medium text-stone-700 mb-3">{t.occCompareTitle}</p>
      <div className="space-y-2.5">
        {[
          { label: areaName, days: areaDays, cls: "bg-cyan-700" },
          { label: t.creteLabel, days: creteDays, cls: "bg-stone-300" },
        ].map(row => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-xs text-stone-600">{row.label}</span>
            <div className="flex-1 h-5 rounded bg-stone-100 overflow-hidden">
              <div className={`h-full rounded ${row.cls}`} style={{ width: w(row.days) }} />
            </div>
            <span className="w-24 shrink-0 text-right text-xs tabular-nums text-stone-700">
              {fmtNum(row.days, locale)} {t.daysPerYear}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  return `${n.toFixed(1)}%`;
}

interface Params {
  locale: string;
  neighbourhood: string;
}

export const dynamicParams = true;

export async function generateStaticParams(): Promise<Array<{ locale: string; neighbourhood: string }>> {
  // 4 fully-translated locales × 24 Crete neighbourhoods = 96 pages prerendered at build time.
  // The 18 remaining site locales are generated on-demand (ISR), cached 24h via
  // `export const revalidate = 86400` above. Page exists for the 22 routed locales:
  // they share the same data, but UI strings fall back to English (pickUiLoc).
  const out: Array<{ locale: string; neighbourhood: string }> = [];
  for (const locale of SUPPORTED) {
    for (const n of CRETE_NEIGHBOURHOODS) {
      out.push({ locale, neighbourhood: n.slug });
    }
  }
  return out;
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { locale, neighbourhood } = await params;
  setRequestLocale(locale);
  if (!VALID_SITE_LOC(locale)) return {};
  const n = findNeighbourhood(neighbourhood);
  if (!n) return {};
  const stats = await getNeighbourhoodStats(n.greek);
  if (!stats) return {};
  const uiLoc = pickUiLoc(locale);
  const t = L[uiLoc];
  const name = n.label[uiLoc];
  return {
    title: t.metaTitle(name),
    description: t.metaDesc(name, stats.listings),
    alternates: buildAlternates(locale, `/airbnb/${neighbourhood}`),
    openGraph: {
      title: t.metaTitle(name),
      description: t.metaDesc(name, stats.listings),
      url: `${BASE_URL}/${locale}/airbnb/${neighbourhood}`,
      type: "article",
    },
  };
}

export default async function AirbnbNeighbourhoodPage(
  { params }: { params: Promise<Params> },
) {
  const { locale, neighbourhood } = await params;
  setRequestLocale(locale);
  if (!VALID_SITE_LOC(locale)) return notFound();

  const n = findNeighbourhood(neighbourhood);
  if (!n) return notFound();

  const uiLoc = pickUiLoc(locale);
  const t = L[uiLoc];
  const name = n.label[uiLoc];
  const regionLabel = REGION_LABEL[n.region][uiLoc];

  const [stats, types, overall, related] = await Promise.all([
    getNeighbourhoodStats(n.greek),
    getNeighbourhoodPropertyTypes(n.greek),
    getCreteOverall(),
    getRelatedGuides(n.greek, uiLoc),
  ]);

  if (!stats || stats.listings === 0) return notFound();

  const siblings = getSiblingNeighbourhoods(neighbourhood);

  // Computed comparison vs the all-Crete baseline (the per-page "insight"):
  // every figure comes from the dataset, nothing is editorialized.
  const priceDelta = overall ? computeDelta(stats.avg_price, overall.avg_price) : null;
  const occDelta = overall ? computeDelta(stats.avg_occupancy_days, overall.avg_occupancy_days) : null;
  const revDelta = overall ? computeDelta(stats.avg_revenue_eur, overall.avg_revenue_eur) : null;
  const insightText =
    priceDelta && occDelta && revDelta ? t.insight(name, priceDelta, occDelta, revDelta) : null;

  // Schema.org JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: t.metaTitle(name),
    description: t.metaDesc(name, stats.listings),
    url: `${BASE_URL}/${locale}/airbnb/${neighbourhood}`,
    creator: { "@type": "Organization", name: "Inside Airbnb" },
    license: "https://creativecommons.org/licenses/by/4.0/",
    spatialCoverage: {
      "@type": "Place",
      name: `${name}, Crete, Greece`,
    },
    temporalCoverage: stats.snapshot_date,
    variableMeasured: [
      "listings count", "average price", "median price",
      "occupancy days per year", "estimated annual revenue",
    ],
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        {/* Back link */}
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.back}
        </Link>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-stone-500 mb-2">
            <MapPin className="h-4 w-4" />
            <span>{regionLabel}</span>
            <span className="mx-1">·</span>
            <span>Crete, Greece</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif text-stone-900 leading-tight">
            {t.pageTitlePrefix} {name}
          </h1>
          {stats.snapshot_date && (
            <p className="mt-2 text-sm text-stone-500">
              {t.snapshot}: {stats.snapshot_date}
            </p>
          )}
        </header>

        {/* Overview cards */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">{t.overview}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card icon={<Home />} label={t.listings} value={fmtNum(stats.listings, locale)} />
            <Card icon={<MapPin />} label={t.uniqueHosts} value={fmtNum(stats.unique_hosts, locale)} />
            <Card icon={<Award />} label={t.superhost} value={fmtPct(stats.superhost_pct)} />
            <Card icon={<Shield />} label={t.amaLicense} value={fmtPct(stats.ama_license_pct)} />
          </div>
        </section>

        {/* Pricing */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">{t.pricing}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card icon={<Euro />} label={t.avgPrice} value={`${fmtEur(stats.avg_price, locale)}`} sub={t.perNight} />
            <Card icon={<Euro />} label={t.medianPrice} value={`${fmtEur(stats.median_price, locale)}`} sub={t.perNight} />
            <Card icon={<Euro />} label={t.priceRange}
                  value={`${fmtEur(stats.p25_price, locale)} - ${fmtEur(stats.p75_price, locale)}`} sub={t.perNight} />
          </div>
          <PriceDistribution
            stats={stats}
            creteAvg={overall?.avg_price ?? null}
            locale={locale}
            t={t}
          />
        </section>

        {/* Performance */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">{t.performance}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card icon={<Calendar />} label={t.occupancy}
                  value={fmtNum(stats.avg_occupancy_days, locale)} sub={t.daysPerYear} />
            <Card icon={<Euro />} label={t.revenue}
                  value={fmtEur(stats.avg_revenue_eur, locale)} sub={t.perYear} />
            <Card icon={<Star />} label={t.rating}
                  value={stats.avg_rating !== null ? stats.avg_rating.toFixed(2) : "-"} sub="/ 5" />
          </div>
          <OccupancyCompare
            areaName={name}
            areaDays={stats.avg_occupancy_days}
            creteDays={overall?.avg_occupancy_days ?? null}
            locale={locale}
            t={t}
          />
          {insightText && (
            <div className="mt-4 rounded-lg border-l-4 border-cyan-700 bg-white border border-stone-200 p-4">
              <p className="text-sm text-stone-800">{insightText}</p>
            </div>
          )}
          {overall && (
            <p className="mt-3 text-xs text-stone-500">
              {t.cretedAvg}: {fmtEur(overall.avg_price, locale)} / {t.perNight} ·
              {" "}{fmtNum(overall.avg_occupancy_days, locale)} {t.daysPerYear} ·
              {" "}{fmtEur(overall.avg_revenue_eur, locale)} {t.perYear}
            </p>
          )}
        </section>

        {/* Property types */}
        {types.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">{t.propertyTypes}</h2>
            <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-600">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">{t.typeName}</th>
                    <th className="text-right px-4 py-2 font-medium">{t.typeCount}</th>
                    <th className="text-right px-4 py-2 font-medium">{t.typePrice}</th>
                    <th className="text-right px-4 py-2 font-medium">{t.typeRating}</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map(pt => (
                    <tr key={pt.property_type} className="border-t border-stone-100">
                      <td className="px-4 py-2 text-stone-800">{pt.property_type}</td>
                      <td className="px-4 py-2 text-right">{fmtNum(pt.count, locale)}</td>
                      <td className="px-4 py-2 text-right">{fmtEur(pt.avg_price, locale)}</td>
                      <td className="px-4 py-2 text-right">
                        {pt.avg_rating !== null ? pt.avg_rating.toFixed(2) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Multi-host insight */}
        <section className="mb-10 rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm text-stone-700">
            <strong>{fmtPct(stats.multi_host_pct)}</strong> {t.multiHost.toLowerCase()}.
          </p>
        </section>

        {/* Related news — omitted entirely when empty: a visible "no articles
            yet" line on most of the 528 pages just advertised thin coverage. */}
        {related.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">{t.newsHeader}</h2>
            <ul className="space-y-2">
              {related.map(g => (
                <li key={g.slug}>
                  <Link
                    href={`/${locale}/news/${g.slug}`}
                    className="text-blue-700 hover:underline"
                  >
                    {g.title}
                  </Link>
                  <span className="ml-2 text-xs text-stone-500">[{g.category}]</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Methodology */}
        <section className="mb-10 text-sm text-stone-600 space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">{t.methodology}</h2>
          <p>{t.methodologyText(stats.snapshot_date || "")}</p>
          <p>
            <strong>{t.caveat}.</strong> {t.caveatText}
          </p>
          <p className="text-xs text-stone-500 pt-2 border-t border-stone-200">
            {t.dataPartner}{" "}
            <a
              href="https://kairosguest.com/rental-analyzer"
              target="_blank"
              rel="noopener"
              className="text-amber-700 hover:underline"
            >
              Kairos
            </a>
            .
          </p>
        </section>

        {/* Bus access — internal linking vers /buses (match opportuniste sur slug) */}
        <BusAccessBox
          locale={locale}
          destinationName={n.label[uiLoc] ?? n.label.en}
          matchSlug={n.slug}
          matchOn="slug"
        />

        {/* CTA */}
        <PromoBox
          icon={TrendingUp}
          title={t.cta}
          ctaLabel={t.ctaButton}
          ctaHref={t.ctaLink}
        />

        {/* Sibling neighbourhoods */}
        {siblings.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-4">
              {t.otherAreas} <span className="text-stone-500 font-normal">- {t.inSameRegion}</span>
            </h2>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {siblings.map(s => (
                <li key={s.slug}>
                  <Link
                    href={`/${locale}/airbnb/${s.slug}`}
                    className="block rounded-md border border-stone-200 px-3 py-2 hover:border-stone-400 hover:bg-stone-50"
                  >
                    {s.label[uiLoc]}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

interface CardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

function Card({ icon, label, value, sub }: CardProps) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-2 text-stone-500 text-xs mb-2">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-xl font-semibold text-stone-900">{value}</div>
      {sub && <div className="text-xs text-stone-500 mt-1">{sub}</div>}
    </div>
  );
}
