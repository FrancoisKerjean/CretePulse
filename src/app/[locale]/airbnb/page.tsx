import { ChevronLeft, ExternalLink } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import type { Metadata } from "next";
import {
  CRETE_NEIGHBOURHOODS,
  REGION_LABEL,
  type Loc,
  type NeighbourhoodMap,
} from "@/lib/airbnb-mappings";
import { buildAlternates } from "@/lib/seo";
import InvestmentCTA from "@/components/InvestmentCTA";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const SUPPORTED: Loc[] = ["en", "fr", "de", "el"];

const L: Record<Loc, {
  title: string;
  metaTitle: string;
  metaDesc: string;
  intro: string;
  source: string;
  back: string;
  viewData: string;
}> = {
  en: {
    title: "Airbnb data by Crete neighbourhood",
    metaTitle: "Airbnb data by Crete neighbourhood: prices, occupancy, yields",
    metaDesc:
      "Inside Airbnb snapshot for 24 Crete municipalities: listings count, average and median nightly price, occupancy, annual revenue, superhost share.",
    intro:
      "We aggregate the public Inside Airbnb dataset by Crete municipality so you can compare pricing, occupancy and revenue across the four prefectures.",
    source: "Source: Inside Airbnb public dataset, snapshot 28 Sep 2025. Aggregation and presentation by Crete Direct.",
    back: "Back to Crete Direct",
    viewData: "View data",
  },
  fr: {
    title: "Données Airbnb par municipalité de Crète",
    metaTitle: "Données Airbnb par municipalité crétoise : prix, taux d'occupation, rendements",
    metaDesc:
      "Snapshot Inside Airbnb sur 24 municipalités crétoises : nombre d'annonces, prix moyen et médian par nuit, occupation, revenu annuel, part de superhôtes.",
    intro:
      "Nous agrégeons le jeu de données public Inside Airbnb par municipalité crétoise pour comparer prix, occupation et revenu entre les quatre préfectures.",
    source: "Source : jeu de données public Inside Airbnb, snapshot 28 septembre 2025. Agrégation et présentation par Crete Direct.",
    back: "Retour à Crete Direct",
    viewData: "Voir les données",
  },
  de: {
    title: "Airbnb-Daten nach Gemeinden Kretas",
    metaTitle: "Airbnb-Daten nach Gemeinden Kretas: Preise, Auslastung, Renditen",
    metaDesc:
      "Inside Airbnb Snapshot für 24 kretische Gemeinden: Anzahl Inserate, durchschnittlicher und Median-Übernachtungspreis, Auslastung, Jahreseinnahmen, Superhost-Anteil.",
    intro:
      "Wir aggregieren den öffentlichen Inside Airbnb Datensatz nach kretischer Gemeinde, damit Sie Preise, Auslastung und Erträge in den vier Präfekturen vergleichen können.",
    source: "Quelle: Inside Airbnb öffentlicher Datensatz, Snapshot 28. September 2025. Aggregation und Darstellung durch Crete Direct.",
    back: "Zurück zu Crete Direct",
    viewData: "Daten ansehen",
  },
  el: {
    title: "Δεδομένα Airbnb ανά δήμο της Κρήτης",
    metaTitle: "Δεδομένα Airbnb ανά δήμο της Κρήτης: τιμές, πληρότητα, αποδόσεις",
    metaDesc:
      "Στιγμιότυπο Inside Airbnb για 24 δήμους της Κρήτης: αριθμός καταχωρήσεων, μέση και διάμεση τιμή ανά διανυκτέρευση, πληρότητα, ετήσιο έσοδο, ποσοστό superhost.",
    intro:
      "Συγκεντρώνουμε το δημόσιο σύνολο δεδομένων Inside Airbnb ανά δήμο της Κρήτης, ώστε να συγκρίνετε τιμές, πληρότητα και έσοδα στις τέσσερις περιφερειακές ενότητες.",
    source: "Πηγή: δημόσιο σύνολο δεδομένων Inside Airbnb, στιγμιότυπο 28 Σεπτεμβρίου 2025. Συγκέντρωση και παρουσίαση από το Crete Direct.",
    back: "Επιστροφή στο Crete Direct",
    viewData: "Δείτε τα δεδομένα",
  },
};

const VALID_LOC = (l: string): l is Loc =>
  (SUPPORTED as readonly string[]).includes(l);

function pickUiLoc(l: string): Loc {
  return VALID_LOC(l) ? l : "en";
}

interface Params {
  locale: string;
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = pickUiLoc(locale);
  const l = L[loc];

  return {
    title: l.metaTitle,
    description: l.metaDesc,
    alternates: buildAlternates(locale, "/airbnb"),
    openGraph: {
      title: l.metaTitle,
      description: l.metaDesc,
      url: `${BASE_URL}/${locale}/airbnb`,
      type: "website",
    },
  };
}

function regionGroups(): Record<NeighbourhoodMap["region"], NeighbourhoodMap[]> {
  const groups: Record<NeighbourhoodMap["region"], NeighbourhoodMap[]> = {
    chania: [],
    rethymno: [],
    heraklion: [],
    lasithi: [],
  };
  for (const n of CRETE_NEIGHBOURHOODS) {
    groups[n.region].push(n);
  }
  return groups;
}

export default async function AirbnbIndexPage(
  { params }: { params: Promise<Params> },
) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = pickUiLoc(locale);
  const uiLoc = loc as Loc;
  const l = L[loc];
  const groups = regionGroups();

  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${BASE_URL}/${locale}/airbnb`,
    url: `${BASE_URL}/${locale}/airbnb`,
    name: l.metaTitle,
    description: l.metaDesc,
    inLanguage: locale,
    isPartOf: {
      "@type": "WebSite",
      name: "Crete Direct",
      url: BASE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: CRETE_NEIGHBOURHOODS.length,
      itemListElement: CRETE_NEIGHBOURHOODS.map((n, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}/${locale}/airbnb/${n.slug}`,
        name: n.label[uiLoc] ?? n.label.en,
      })),
    },
  };

  return (
    <main className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />

      <div className="bg-aegean text-white">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white mb-6"
          >
            <ChevronLeft className="w-4 h-4" /> {l.back}
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            {l.title}
          </h1>
          <p className="mt-4 text-white/80 text-base max-w-3xl">
            {l.intro}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {(["chania", "rethymno", "heraklion", "lasithi"] as const).map(
          (region) => (
            <section key={region} className="mb-10">
              <h2 className="text-xl font-semibold text-text mb-4 border-b border-border pb-2">
                {REGION_LABEL[region][uiLoc]}
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {groups[region].map((n) => (
                  <li key={n.slug}>
                    <Link
                      href={`/${locale}/airbnb/${n.slug}`}
                      className="flex items-center justify-between rounded-lg bg-white border border-border px-4 py-3 hover:border-aegean/40 hover:shadow-sm transition-all group"
                    >
                      <span className="font-medium text-text">
                        {n.label[uiLoc] ?? n.label.en}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-text-muted group-hover:text-aegean">
                        {l.viewData}
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ),
        )}

        <div className="mt-12 rounded-xl bg-stone p-4 text-xs text-text-muted">
          {l.source}
        </div>

        <InvestmentCTA locale={locale} contentType="airbnb" />
      </div>
    </main>
  );
}
