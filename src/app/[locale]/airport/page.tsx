import { ChevronLeft, Plane, TrendingUp } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CRETE_AIRPORTS,
  getAllAirportStats,
  type AirportLoc,
} from "@/lib/airports";
import { buildAlternates } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const SUPPORTED: AirportLoc[] = ["en", "fr", "de", "el"];

const VALID_LOC = (l: string): l is AirportLoc =>
  (SUPPORTED as string[]).includes(l);
const VALID_SITE_LOC = (l: string): boolean =>
  (routing.locales as readonly string[]).includes(l);

function pickUiLoc(l: string): AirportLoc {
  return VALID_LOC(l) ? l : "en";
}

const L: Record<AirportLoc, {
  metaTitle: string;
  metaDesc: string;
  back: string;
  h1: string;
  intro: string;
  last12: string;
  vsPrevYear: string;
  dataThrough: string;
  viewData: string;
  kastelliTitle: string;
  kastelliText: string;
}> = {
  en: {
    metaTitle: "Crete airports: passenger traffic and data (HER, CHQ, JSH)",
    metaDesc:
      "Official monthly passenger statistics for Crete's three airports: Heraklion, Chania and Sitia. Seasonality, busiest months and year-on-year trends from HCAA data.",
    back: "Back to Crete",
    h1: "Crete airports in numbers",
    intro:
      "Crete has three civil airports: Heraklion (HER), Chania (CHQ) and Sitia (JSH). This page tracks their official monthly passenger traffic, published by the Hellenic Civil Aviation Authority (HCAA).",
    last12: "Passengers, last 12 months",
    vsPrevYear: "vs a year earlier",
    dataThrough: "Data through",
    viewData: "View monthly data",
    kastelliTitle: "Kastelli: a new airport in 2028",
    kastelliText:
      "A new international airport is under construction at Kastelli, south-east of Heraklion. It is scheduled to open in 2028 with a planned capacity of up to 18 million passengers a year, replacing the current Heraklion airport.",
  },
  fr: {
    metaTitle: "Aéroports de Crète : trafic passagers et données (HER, CHQ, JSH)",
    metaDesc:
      "Statistiques passagers mensuelles officielles des trois aéroports de Crète : Héraklion, La Canée et Sitia. Saisonnalité, mois d'affluence et tendances annuelles, données HCAA.",
    back: "Retour à la Crète",
    h1: "Les aéroports de Crète en chiffres",
    intro:
      "La Crète compte trois aéroports civils : Héraklion (HER), La Canée (CHQ) et Sitia (JSH). Cette page suit leur trafic passagers mensuel officiel, publié par l'aviation civile grecque (HCAA).",
    last12: "Passagers, 12 derniers mois",
    vsPrevYear: "vs un an plus tôt",
    dataThrough: "Données jusqu'à",
    viewData: "Voir les données mensuelles",
    kastelliTitle: "Kastelli : un nouvel aéroport en 2028",
    kastelliText:
      "Un nouvel aéroport international est en construction à Kastelli, au sud-est d'Héraklion. Son ouverture est prévue en 2028, avec une capacité visée de 18 millions de passagers par an. Il remplacera l'actuel aéroport d'Héraklion.",
  },
  de: {
    metaTitle: "Flughäfen auf Kreta: Passagierzahlen und Daten (HER, CHQ, JSH)",
    metaDesc:
      "Offizielle monatliche Passagierstatistiken der drei Flughäfen Kretas: Heraklion, Chania und Sitia. Saisonalität, Stoßzeiten und Jahrestrends aus HCAA-Daten.",
    back: "Zurück nach Kreta",
    h1: "Kretas Flughäfen in Zahlen",
    intro:
      "Kreta hat drei zivile Flughäfen: Heraklion (HER), Chania (CHQ) und Sitia (JSH). Diese Seite verfolgt deren offiziellen monatlichen Passagierverkehr, veröffentlicht von der griechischen Zivilluftfahrtbehörde (HCAA).",
    last12: "Passagiere, letzte 12 Monate",
    vsPrevYear: "ggü. Vorjahr",
    dataThrough: "Daten bis",
    viewData: "Monatsdaten ansehen",
    kastelliTitle: "Kastelli: ein neuer Flughafen 2028",
    kastelliText:
      "Südöstlich von Heraklion entsteht in Kastelli ein neuer internationaler Flughafen. Die Eröffnung ist für 2028 geplant, mit einer Kapazität von bis zu 18 Millionen Passagieren pro Jahr. Er ersetzt den heutigen Flughafen Heraklion.",
  },
  el: {
    metaTitle: "Αεροδρόμια Κρήτης: επιβατική κίνηση και δεδομένα (HER, CHQ, JSH)",
    metaDesc:
      "Επίσημα μηνιαία στατιστικά επιβατών για τα τρία αεροδρόμια της Κρήτης: Ηράκλειο, Χανιά και Σητεία. Εποχικότητα, μήνες αιχμής και ετήσιες τάσεις από στοιχεία ΥΠΑ.",
    back: "Πίσω στην Κρήτη",
    h1: "Τα αεροδρόμια της Κρήτης σε αριθμούς",
    intro:
      "Η Κρήτη διαθέτει τρία πολιτικά αεροδρόμια: Ηράκλειο (HER), Χανιά (CHQ) και Σητεία (JSH). Η σελίδα παρακολουθεί την επίσημη μηνιαία επιβατική τους κίνηση, όπως δημοσιεύεται από την ΥΠΑ.",
    last12: "Επιβάτες, τελευταίοι 12 μήνες",
    vsPrevYear: "σε σχέση με πέρυσι",
    dataThrough: "Στοιχεία έως",
    viewData: "Δείτε τα μηνιαία δεδομένα",
    kastelliTitle: "Καστέλλι: νέο αεροδρόμιο το 2028",
    kastelliText:
      "Νοτιοανατολικά του Ηρακλείου κατασκευάζεται νέο διεθνές αεροδρόμιο στο Καστέλλι. Η λειτουργία του προγραμματίζεται για το 2028, με δυναμικότητα έως 18 εκατ. επιβάτες ετησίως. Θα αντικαταστήσει το σημερινό αεροδρόμιο του Ηρακλείου.",
  },
};

function monthName(loc: string, m: number): string {
  return new Intl.DateTimeFormat(loc, { month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(2000, m - 1, 1)));
}

function fmtNum(n: number | null | undefined, locale: string): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  return Math.round(n).toLocaleString(locale);
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export const dynamicParams = true;

export function generateStaticParams(): Array<{ locale: string }> {
  return SUPPORTED.map(locale => ({ locale }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!VALID_SITE_LOC(locale)) return {};
  const t = L[pickUiLoc(locale)];
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    alternates: buildAlternates(locale, "/airport"),
    openGraph: {
      title: t.metaTitle,
      description: t.metaDesc,
      url: `${BASE_URL}/${locale}/airport`,
    },
  };
}

export default async function AirportsIndexPage(
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!VALID_SITE_LOC(locale)) return notFound();

  const uiLoc = pickUiLoc(locale);
  const t = L[uiLoc];
  const allStats = await getAllAirportStats();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t.metaTitle,
    description: t.metaDesc,
    url: `${BASE_URL}/${locale}/airport`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: CRETE_AIRPORTS.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: a.officialName,
        url: `${BASE_URL}/${locale}/airport/${a.slug}`,
      })),
    },
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.back}
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900">{t.h1}</h1>
          <p className="mt-3 text-stone-600 max-w-3xl">{t.intro}</p>
        </header>

        <section className="grid md:grid-cols-3 gap-4 mb-10">
          {CRETE_AIRPORTS.map(a => {
            const stats = allStats.get(a.iata);
            return (
              <Link
                key={a.slug}
                href={`/${locale}/airport/${a.slug}`}
                className="group rounded-xl border border-stone-200 bg-white p-5 hover:border-stone-400 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm text-stone-500 mb-2">
                  <Plane className="h-4 w-4" />
                  <span>{a.iata}</span>
                </div>
                <h2 className="text-lg font-semibold text-stone-900 group-hover:underline">
                  {a.city[uiLoc]}
                </h2>
                {stats && (
                  <>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-500">
                      <TrendingUp className="h-3.5 w-3.5" /> {t.last12}
                    </div>
                    <div className="text-2xl font-bold text-stone-900">
                      {fmtNum(stats.rolling12, locale)}
                    </div>
                    {stats.rolling12YoYPct !== null && (
                      <div className={`text-sm ${stats.rolling12YoYPct >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {fmtPct(stats.rolling12YoYPct)} {t.vsPrevYear}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-stone-500 capitalize">
                      {t.dataThrough} {monthName(uiLoc, stats.latest.month)} {stats.latest.year}
                    </div>
                  </>
                )}
                <div className="mt-3 text-sm text-cyan-800">{t.viewData}</div>
              </Link>
            );
          })}
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-stone-900 mb-1.5">{t.kastelliTitle}</h2>
          <p className="text-stone-700">{t.kastelliText}</p>
        </section>
      </div>
    </main>
  );
}
