import { ChevronLeft, MapPin, Home, Euro, Calendar, Star, Award, Shield } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { BusAccessBox } from "@/components/BusAccessBox";
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
    alternates: buildAlternates(`/airbnb/${neighbourhood}`),
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

        {/* Related news */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">{t.newsHeader}</h2>
          {related.length === 0 ? (
            <p className="text-sm text-stone-500">{t.noNews}</p>
          ) : (
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
          )}
        </section>

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
        <section className="mb-10 rounded-lg bg-stone-900 p-6 text-white">
          <p className="mb-3">{t.cta}</p>
          <a
            href={t.ctaLink}
            target="_blank"
            rel="noopener"
            className="inline-block rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-amber-400"
          >
            {t.ctaButton}
          </a>
        </section>

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
