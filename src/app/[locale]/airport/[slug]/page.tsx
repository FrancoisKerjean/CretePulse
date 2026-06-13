import { ChevronLeft, Plane, TrendingUp, CalendarDays } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CRETE_AIRPORTS,
  findAirport,
  getAirportStats,
  type AirportLoc,
  type AirportStats,
} from "@/lib/airports";
import { buildAlternates } from "@/lib/seo";
import { routing } from "@/i18n/routing";
import { CarPromo } from "@/components/car-rental/CarPromo";

// Pickup contextuel du wizard /car-rental : CHQ -> chania-airport, HER ->
// heraklion. Sitia (JSH) hors zone couverte -> encart sans pickup (étape 1).
const CAR_PICKUP: Record<string, string> = {
  CHQ: "chania-airport",
  HER: "heraklion",
};

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const SUPPORTED: AirportLoc[] = ["en", "fr", "de", "el"];

const VALID_LOC = (l: string): l is AirportLoc =>
  (SUPPORTED as string[]).includes(l);
const VALID_SITE_LOC = (l: string): boolean =>
  (routing.locales as readonly string[]).includes(l);

/** Pick the closest UI locale we have translations for. */
function pickUiLoc(l: string): AirportLoc {
  return VALID_LOC(l) ? l : "en";
}

/** French élision: "de Héraklion" -> "d'Héraklion", "de La Canée" unchanged. */
function frDe(city: string): string {
  return /^[aeiouéèêh]/i.test(city) ? `d'${city}` : `de ${city}`;
}

const L: Record<AirportLoc, {
  metaTitle: (city: string, iata: string) => string;
  metaDesc: (city: string, pax: string, year: number) => string;
  back: string;
  subtitle: (mn: string, mx: string) => string;
  last12: string;
  latestMonth: string;
  busiest: string;
  yearTotal: (year: number) => string;
  vsPrevYear: string;
  seasonality: string;
  seasonalityIntro: (city: string, busy: string, quiet: string) => string;
  monthlyTable: string;
  colMonth: string;
  colPax: string;
  colYoY: string;
  passengers: string;
  avgPassengers: string;
  gettingThere: string;
  transferLink: (city: string) => string;
  busesLink: string;
  flightsCta: (city: string) => string;
  flightsButton: string;
  stayingNearby: string;
  airbnbLink: (area: string) => string;
  faqTitle: string;
  faqPaxQ: (city: string, year: number) => string;
  faqPaxA: (city: string, pax: string, year: number) => string;
  faqBusyQ: (city: string) => string;
  faqBusyA: (busy: string, avg: string, quiet: string, quietAvg: string) => string;
  faqWinterQ: (city: string) => string;
  faqWinterA: (city: string, quiet: string, quietAvg: string) => string;
  kastelliTitle: string;
  kastelliText: string;
  methodology: string;
  methodologyText: (mn: string, mx: string) => string;
  sourceLabel: string;
}> = {
  en: {
    metaTitle: (city, iata) => `${city} Airport (${iata}): passenger traffic, busiest months, data`,
    metaDesc: (city, pax, year) =>
      `Official HCAA data for ${city} Airport, Crete: ${pax} passengers in ${year}, monthly traffic, seasonality and year-on-year trends.`,
    back: "Back to Crete",
    subtitle: (mn, mx) => `Official monthly passenger statistics, ${mn} to ${mx}`,
    last12: "Passengers, last 12 months",
    latestMonth: "Latest month",
    busiest: "Busiest month",
    yearTotal: year => `Total ${year}`,
    vsPrevYear: "vs a year earlier",
    seasonality: "Monthly traffic by year",
    seasonalityIntro: (city, busy, quiet) =>
      `${city} airport traffic is strongly seasonal: ${busy} is the busiest month on average, while ${quiet} is the quietest.`,
    monthlyTable: "Last 13 months in detail",
    colMonth: "Month",
    colPax: "Passengers",
    colYoY: "Year-on-year",
    passengers: "passengers",
    avgPassengers: "passengers on average",
    gettingThere: "Getting to and from the airport",
    transferLink: city => `${city} airport to the city centre`,
    busesLink: "Crete bus routes and timetables",
    flightsCta: city => `Compare flights to ${city}`,
    flightsButton: "Find flights",
    stayingNearby: "Staying nearby? Accommodation market data",
    airbnbLink: area => `Airbnb data for ${area}`,
    faqTitle: "Frequently asked questions",
    faqPaxQ: (city, year) => `How many passengers does ${city} Airport handle per year?`,
    faqPaxA: (city, pax, year) =>
      `${city} Airport handled ${pax} passengers in ${year}, according to official Hellenic Civil Aviation Authority (HCAA) statistics.`,
    faqBusyQ: city => `What is the busiest month at ${city} Airport?`,
    faqBusyA: (busy, avg, quiet, quietAvg) =>
      `${busy} is the busiest month, with ${avg} ${"passengers on average"}. The quietest is ${quiet} (${quietAvg}).`,
    faqWinterQ: city => `Is ${city} Airport open in winter?`,
    faqWinterA: (city, quiet, quietAvg) =>
      `Yes. ${city} Airport operates year-round, but winter traffic is a fraction of summer levels: ${quiet} averages ${quietAvg} passengers.`,
    kastelliTitle: "Kastelli: the next Heraklion airport",
    kastelliText:
      "A new international airport is under construction at Kastelli, about 30 km south-east of Heraklion. It is scheduled to open in 2028 with a planned capacity of up to 18 million passengers a year and will replace the current Nikos Kazantzakis airport.",
    methodology: "Methodology and source",
    methodologyText: (mn, mx) =>
      `Figures are taken from the monthly airport traffic reports (“ΚΙΝΗΣΗ ΑΕΡΟΛΙΜΕΝΩΝ”) published by the Hellenic Civil Aviation Authority (HCAA, ypa.gr), covering ${mn} to ${mx}. Passenger totals include arrivals, departures and transit. HCAA publishes data with roughly two months of delay; this page updates automatically as new months are released.`,
    sourceLabel: "Source file (HCAA XLSX)",
  },
  fr: {
    metaTitle: (city, iata) => `Aéroport ${frDe(city)} (${iata}) : trafic passagers, affluence, données`,
    metaDesc: (city, pax, year) =>
      `Données officielles HCAA pour l'aéroport ${frDe(city)}, Crète : ${pax} passagers en ${year}, trafic mensuel, saisonnalité et tendances annuelles.`,
    back: "Retour à la Crète",
    subtitle: (mn, mx) => `Statistiques passagers mensuelles officielles, de ${mn} à ${mx}`,
    last12: "Passagers, 12 derniers mois",
    latestMonth: "Dernier mois",
    busiest: "Mois le plus chargé",
    yearTotal: year => `Total ${year}`,
    vsPrevYear: "vs un an plus tôt",
    seasonality: "Trafic mensuel par année",
    seasonalityIntro: (city, busy, quiet) =>
      `Le trafic de l'aéroport ${frDe(city)} est très saisonnier : ${busy} est en moyenne le mois le plus chargé, ${quiet} le plus calme.`,
    monthlyTable: "Les 13 derniers mois en détail",
    colMonth: "Mois",
    colPax: "Passagers",
    colYoY: "Évolution annuelle",
    passengers: "passagers",
    avgPassengers: "passagers en moyenne",
    gettingThere: "Rejoindre et quitter l'aéroport",
    transferLink: city => `De l'aéroport ${frDe(city)} au centre-ville`,
    busesLink: "Lignes de bus et horaires en Crète",
    flightsCta: city => `Comparer les vols vers ${city}`,
    flightsButton: "Trouver un vol",
    stayingNearby: "Vous logez à proximité ? Données du marché locatif",
    airbnbLink: area => `Données Airbnb pour ${area}`,
    faqTitle: "Questions fréquentes",
    faqPaxQ: (city, year) => `Combien de passagers l'aéroport ${frDe(city)} accueille-t-il par an ?`,
    faqPaxA: (city, pax, year) =>
      `L'aéroport ${frDe(city)} a accueilli ${pax} passagers en ${year}, selon les statistiques officielles de l'aviation civile grecque (HCAA).`,
    faqBusyQ: city => `Quel est le mois le plus chargé à l'aéroport ${frDe(city)} ?`,
    faqBusyA: (busy, avg, quiet, quietAvg) =>
      `${busy} est le mois le plus chargé, avec ${avg} passagers en moyenne. Le plus calme est ${quiet} (${quietAvg}).`,
    faqWinterQ: city => `L'aéroport ${frDe(city)} est-il ouvert en hiver ?`,
    faqWinterA: (city, quiet, quietAvg) =>
      `Oui. L'aéroport ${frDe(city)} fonctionne toute l'année, mais le trafic hivernal est une fraction du niveau estival : ${quiet} compte ${quietAvg} passagers en moyenne.`,
    kastelliTitle: "Kastelli : le futur aéroport d'Héraklion",
    kastelliText:
      "Un nouvel aéroport international est en construction à Kastelli, à environ 30 km au sud-est d'Héraklion. Son ouverture est prévue en 2028, avec une capacité visée de 18 millions de passagers par an. Il remplacera l'actuel aéroport Nikos Kazantzakis.",
    methodology: "Méthodologie et source",
    methodologyText: (mn, mx) =>
      `Les chiffres proviennent des rapports mensuels de trafic aéroportuaire (« ΚΙΝΗΣΗ ΑΕΡΟΛΙΜΕΝΩΝ ») publiés par l'aviation civile grecque (HCAA, ypa.gr), couvrant la période de ${mn} à ${mx}. Les totaux passagers incluent arrivées, départs et transit. La HCAA publie avec environ deux mois de décalage ; cette page se met à jour automatiquement.`,
    sourceLabel: "Fichier source (XLSX HCAA)",
  },
  de: {
    metaTitle: (city, iata) => `Flughafen ${city} (${iata}): Passagierzahlen, Stoßzeiten, Daten`,
    metaDesc: (city, pax, year) =>
      `Offizielle HCAA-Daten für den Flughafen ${city}, Kreta: ${pax} Passagiere in ${year}, monatlicher Verkehr, Saisonalität und Jahrestrends.`,
    back: "Zurück nach Kreta",
    subtitle: (mn, mx) => `Offizielle monatliche Passagierstatistik, ${mn} bis ${mx}`,
    last12: "Passagiere, letzte 12 Monate",
    latestMonth: "Letzter Monat",
    busiest: "Verkehrsreichster Monat",
    yearTotal: year => `Gesamt ${year}`,
    vsPrevYear: "ggü. Vorjahr",
    seasonality: "Monatlicher Verkehr nach Jahr",
    seasonalityIntro: (city, busy, quiet) =>
      `Der Verkehr am Flughafen ${city} ist stark saisonal: ${busy} ist im Schnitt der stärkste Monat, ${quiet} der ruhigste.`,
    monthlyTable: "Die letzten 13 Monate im Detail",
    colMonth: "Monat",
    colPax: "Passagiere",
    colYoY: "Veränderung zum Vorjahr",
    passengers: "Passagiere",
    avgPassengers: "Passagiere im Durchschnitt",
    gettingThere: "Anreise und Abreise",
    transferLink: city => `Vom Flughafen ${city} ins Stadtzentrum`,
    busesLink: "Buslinien und Fahrpläne auf Kreta",
    flightsCta: city => `Flüge nach ${city} vergleichen`,
    flightsButton: "Flüge finden",
    stayingNearby: "Unterkunft in der Nähe? Marktdaten",
    airbnbLink: area => `Airbnb-Daten für ${area}`,
    faqTitle: "Häufige Fragen",
    faqPaxQ: (city, year) => `Wie viele Passagiere fertigt der Flughafen ${city} pro Jahr ab?`,
    faqPaxA: (city, pax, year) =>
      `Der Flughafen ${city} fertigte ${year} insgesamt ${pax} Passagiere ab, laut offizieller Statistik der griechischen Zivilluftfahrtbehörde (HCAA).`,
    faqBusyQ: city => `Welcher Monat ist am Flughafen ${city} am verkehrsreichsten?`,
    faqBusyA: (busy, avg, quiet, quietAvg) =>
      `${busy} ist der verkehrsreichste Monat mit durchschnittlich ${avg} Passagieren. Der ruhigste ist ${quiet} (${quietAvg}).`,
    faqWinterQ: city => `Ist der Flughafen ${city} im Winter geöffnet?`,
    faqWinterA: (city, quiet, quietAvg) =>
      `Ja. Der Flughafen ${city} ist ganzjährig in Betrieb, der Winterverkehr liegt aber weit unter dem Sommerniveau: im ${quiet} sind es durchschnittlich ${quietAvg} Passagiere.`,
    kastelliTitle: "Kastelli: der künftige Flughafen von Heraklion",
    kastelliText:
      "Etwa 30 km südöstlich von Heraklion entsteht in Kastelli ein neuer internationaler Flughafen. Die Eröffnung ist für 2028 geplant, mit einer Kapazität von bis zu 18 Millionen Passagieren pro Jahr. Er wird den heutigen Flughafen Nikos Kazantzakis ersetzen.",
    methodology: "Methodik und Quelle",
    methodologyText: (mn, mx) =>
      `Die Zahlen stammen aus den monatlichen Verkehrsberichten („ΚΙΝΗΣΗ ΑΕΡΟΛΙΜΕΝΩΝ“) der griechischen Zivilluftfahrtbehörde (HCAA, ypa.gr) für den Zeitraum ${mn} bis ${mx}. Die Passagierzahlen umfassen Ankünfte, Abflüge und Transit. Die HCAA veröffentlicht mit rund zwei Monaten Verzögerung; diese Seite aktualisiert sich automatisch.`,
    sourceLabel: "Quelldatei (HCAA-XLSX)",
  },
  el: {
    metaTitle: (city, iata) => `Αεροδρόμιο ${city} (${iata}): επιβατική κίνηση, αιχμή, δεδομένα`,
    metaDesc: (city, pax, year) =>
      `Επίσημα στοιχεία ΥΠΑ για το αεροδρόμιο ${city}, Κρήτη: ${pax} επιβάτες το ${year}, μηνιαία κίνηση, εποχικότητα και ετήσιες τάσεις.`,
    back: "Πίσω στην Κρήτη",
    subtitle: (mn, mx) => `Επίσημα μηνιαία στατιστικά επιβατών, ${mn} έως ${mx}`,
    last12: "Επιβάτες, τελευταίοι 12 μήνες",
    latestMonth: "Τελευταίος μήνας",
    busiest: "Μήνας αιχμής",
    yearTotal: year => `Σύνολο ${year}`,
    vsPrevYear: "σε σχέση με πέρυσι",
    seasonality: "Μηνιαία κίνηση ανά έτος",
    seasonalityIntro: (city, busy, quiet) =>
      `Η κίνηση στο αεροδρόμιο ${city} είναι έντονα εποχική: ο ${busy} είναι κατά μέσο όρο ο πιο φορτωμένος μήνας, ενώ ο ${quiet} ο πιο ήσυχος.`,
    monthlyTable: "Οι τελευταίοι 13 μήνες αναλυτικά",
    colMonth: "Μήνας",
    colPax: "Επιβάτες",
    colYoY: "Ετήσια μεταβολή",
    passengers: "επιβάτες",
    avgPassengers: "επιβάτες κατά μέσο όρο",
    gettingThere: "Μετάβαση από και προς το αεροδρόμιο",
    transferLink: city => `Από το αεροδρόμιο ${city} στο κέντρο`,
    busesLink: "Δρομολόγια λεωφορείων στην Κρήτη",
    flightsCta: city => `Σύγκριση πτήσεων προς ${city}`,
    flightsButton: "Εύρεση πτήσεων",
    stayingNearby: "Μένετε κοντά; Δεδομένα αγοράς καταλυμάτων",
    airbnbLink: area => `Δεδομένα Airbnb για ${area}`,
    faqTitle: "Συχνές ερωτήσεις",
    faqPaxQ: (city, year) => `Πόσους επιβάτες εξυπηρετεί το αεροδρόμιο ${city} ετησίως;`,
    faqPaxA: (city, pax, year) =>
      `Το αεροδρόμιο ${city} εξυπηρέτησε ${pax} επιβάτες το ${year}, σύμφωνα με τα επίσημα στοιχεία της Υπηρεσίας Πολιτικής Αεροπορίας (ΥΠΑ).`,
    faqBusyQ: city => `Ποιος είναι ο πιο φορτωμένος μήνας στο αεροδρόμιο ${city};`,
    faqBusyA: (busy, avg, quiet, quietAvg) =>
      `Ο ${busy} είναι ο πιο φορτωμένος μήνας, με ${avg} επιβάτες κατά μέσο όρο. Ο πιο ήσυχος είναι ο ${quiet} (${quietAvg}).`,
    faqWinterQ: city => `Λειτουργεί το αεροδρόμιο ${city} τον χειμώνα;`,
    faqWinterA: (city, quiet, quietAvg) =>
      `Ναι. Το αεροδρόμιο ${city} λειτουργεί όλο τον χρόνο, αλλά η χειμερινή κίνηση είναι πολύ χαμηλότερη από την καλοκαιρινή: ο ${quiet} έχει κατά μέσο όρο ${quietAvg} επιβάτες.`,
    kastelliTitle: "Καστέλλι: το επόμενο αεροδρόμιο του Ηρακλείου",
    kastelliText:
      "Ένα νέο διεθνές αεροδρόμιο κατασκευάζεται στο Καστέλλι, περίπου 30 χλμ νοτιοανατολικά του Ηρακλείου. Η έναρξη λειτουργίας προγραμματίζεται για το 2028, με σχεδιαζόμενη δυναμικότητα έως 18 εκατ. επιβάτες ετησίως. Θα αντικαταστήσει το σημερινό αεροδρόμιο «Νίκος Καζαντζάκης».",
    methodology: "Μεθοδολογία και πηγή",
    methodologyText: (mn, mx) =>
      `Τα στοιχεία προέρχονται από τις μηνιαίες αναφορές «ΚΙΝΗΣΗ ΑΕΡΟΛΙΜΕΝΩΝ» της Υπηρεσίας Πολιτικής Αεροπορίας (ΥΠΑ, ypa.gr), για την περίοδο ${mn} έως ${mx}. Οι επιβάτες περιλαμβάνουν αφίξεις, αναχωρήσεις και transit. Η ΥΠΑ δημοσιεύει με καθυστέρηση περίπου δύο μηνών· η σελίδα ενημερώνεται αυτόματα.`,
    sourceLabel: "Αρχείο πηγής (XLSX ΥΠΑ)",
  },
};

function monthName(loc: string, m: number, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat(loc, { month: style, timeZone: "UTC" })
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

function periodLabel(loc: string, row: { year: number; month: number }): string {
  return `${monthName(loc, row.month)} ${row.year}`;
}

/** Server-rendered seasonality chart: one polyline per calendar year. */
function SeasonalityChart({ stats, uiLoc }: { stats: AirportStats; uiLoc: string }) {
  const W = 720;
  const H = 280;
  const PAD = { top: 16, right: 16, bottom: 36, left: 56 };
  const years = [...new Set(stats.rows.map(r => r.year))].sort();
  const maxPax = Math.max(...stats.rows.map(r => r.pax_total ?? 0), 1);
  const x = (m: number) =>
    PAD.left + ((m - 1) / 11) * (W - PAD.left - PAD.right);
  const y = (v: number) =>
    H - PAD.bottom - (v / maxPax) * (H - PAD.top - PAD.bottom);

  const COLORS = ["#a8a29e", "#0e7490", "#ea580c", "#7c3aed"];
  const series = years.map((yr, i) => {
    const pts = stats.rows
      .filter(r => r.year === yr && r.pax_total !== null)
      .map(r => `${x(r.month).toFixed(1)},${y(r.pax_total!).toFixed(1)}`)
      .join(" ");
    return { yr, color: COLORS[i % COLORS.length], pts };
  });

  const gridVals = [0.25, 0.5, 0.75, 1].map(f => f * maxPax);
  const compact = (v: number) =>
    new Intl.NumberFormat(uiLoc, { notation: "compact", maximumFractionDigits: 1 }).format(v);

  return (
    <figure className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[560px] h-auto"
        role="img"
        aria-label="Monthly passengers by year"
      >
        {gridVals.map(v => (
          <g key={v}>
            <line
              x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)}
              stroke="#e7e5e4" strokeWidth="1"
            />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#78716c">
              {compact(v)}
            </text>
          </g>
        ))}
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
          <text
            key={m} x={x(m)} y={H - PAD.bottom + 18}
            textAnchor="middle" fontSize="11" fill="#78716c"
          >
            {monthName(uiLoc, m, "short")}
          </text>
        ))}
        <line
          x1={PAD.left} x2={W - PAD.right}
          y1={H - PAD.bottom} y2={H - PAD.bottom}
          stroke="#d6d3d1" strokeWidth="1"
        />
        {series.map(s => (
          <polyline
            key={s.yr} points={s.pts} fill="none"
            stroke={s.color} strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round"
          />
        ))}
      </svg>
      <figcaption className="flex flex-wrap gap-4 mt-2 text-sm text-stone-600">
        {series.map(s => (
          <span key={s.yr} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5" style={{ backgroundColor: s.color }} />
            {s.yr}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

interface Params {
  locale: string;
  slug: string;
}

export const dynamicParams = true;

export function generateStaticParams(): Array<{ locale: string; slug: string }> {
  // 4 fully-translated locales x 3 airports prerendered; the other 18 site
  // locales are generated on demand (ISR 24h) with English UI fallback.
  const out: Array<{ locale: string; slug: string }> = [];
  for (const locale of SUPPORTED) {
    for (const a of CRETE_AIRPORTS) out.push({ locale, slug: a.slug });
  }
  return out;
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!VALID_SITE_LOC(locale)) return {};
  const airport = findAirport(slug);
  if (!airport) return {};
  const stats = await getAirportStats(airport.iata);
  if (!stats) return {};
  const uiLoc = pickUiLoc(locale);
  const t = L[uiLoc];
  const city = uiLoc === "el" ? airport.cityGenitiveEl : airport.city[uiLoc];
  const yearRef = stats.lastFullYear ?? { year: stats.latest.year, pax: stats.rolling12 };
  const title = t.metaTitle(city, airport.iata);
  const description = t.metaDesc(city, fmtNum(yearRef.pax, locale), yearRef.year);
  return {
    title,
    description,
    alternates: buildAlternates(locale, `/airport/${slug}`),
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/airport/${slug}`,
      type: "article",
    },
  };
}

export default async function AirportPage(
  { params }: { params: Promise<Params> },
) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!VALID_SITE_LOC(locale)) return notFound();

  const airport = findAirport(slug);
  if (!airport) return notFound();

  const stats = await getAirportStats(airport.iata);
  if (!stats) return notFound();

  const uiLoc = pickUiLoc(locale);
  const t = L[uiLoc];
  const city = uiLoc === "el" ? airport.cityGenitiveEl : airport.city[uiLoc];

  const first = stats.rows[0];
  const latest = stats.latest;
  const busyName = monthName(uiLoc, stats.busiestMonth);
  const quietName = monthName(uiLoc, stats.quietestMonth);
  const busyAvg = stats.monthlyAvg.find(m => m.month === stats.busiestMonth)?.avg ?? null;
  const quietAvg = stats.monthlyAvg.find(m => m.month === stats.quietestMonth)?.avg ?? null;
  const last13 = [...stats.rows].slice(-13).reverse();
  const yearRef = stats.lastFullYear ?? { year: latest.year, pax: stats.rolling12 };

  const yoyFor = (row: { year: number; month: number; pax_total: number | null }): number | null => {
    const prev = stats.rows.find(r => r.year === row.year - 1 && r.month === row.month);
    if (!prev?.pax_total || row.pax_total === null) return null;
    return ((row.pax_total - prev.pax_total) / prev.pax_total) * 100;
  };

  const faq: Array<{ q: string; a: string }> = [
    {
      q: t.faqPaxQ(city, yearRef.year),
      a: t.faqPaxA(city, fmtNum(yearRef.pax, locale), yearRef.year),
    },
    {
      q: t.faqBusyQ(city),
      a: t.faqBusyA(
        busyName, fmtNum(busyAvg, locale),
        quietName, fmtNum(quietAvg, locale),
      ),
    },
    {
      q: t.faqWinterQ(city),
      a: t.faqWinterA(city, quietName, fmtNum(quietAvg, locale)),
    },
  ];

  const pageUrl = `${BASE_URL}/${locale}/airport/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Airport",
        name: airport.officialName,
        iataCode: airport.iata,
        geo: { "@type": "GeoCoordinates", latitude: airport.lat, longitude: airport.lng },
        address: { "@type": "PostalAddress", addressLocality: airport.city.en, addressRegion: "Crete", addressCountry: "GR" },
      },
      {
        "@type": "Dataset",
        name: t.metaTitle(city, airport.iata),
        description: t.metaDesc(city, fmtNum(yearRef.pax, locale), yearRef.year),
        url: pageUrl,
        creator: { "@type": "Organization", name: "Hellenic Civil Aviation Authority (HCAA)" },
        temporalCoverage: `${first.year}-${String(first.month).padStart(2, "0")}/${latest.year}-${String(latest.month).padStart(2, "0")}`,
        variableMeasured: ["passengers per month", "aircraft movements", "international share"],
        ...(stats.sourceUrl ? { distribution: { "@type": "DataDownload", contentUrl: stats.sourceUrl, encodingFormat: "application/vnd.ms-excel" } } : {}),
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map(f => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Crete Direct", item: `${BASE_URL}/${locale}` },
          { "@type": "ListItem", position: 2, name: "Airports", item: `${BASE_URL}/${locale}/airport` },
          { "@type": "ListItem", position: 3, name: city, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <Link
          href={`/${locale}/airport`}
          className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.back}
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-stone-500 mb-2">
            <Plane className="h-4 w-4" />
            <span>{airport.iata}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900">
            {t.metaTitle(city, airport.iata).split(":")[0]}
          </h1>
          <p className="mt-2 text-stone-600">
            {t.subtitle(periodLabel(uiLoc, first), periodLabel(uiLoc, latest))}
          </p>
        </header>

        {/* Key stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
              <TrendingUp className="h-3.5 w-3.5" /> {t.last12}
            </div>
            <div className="text-2xl font-bold text-stone-900">{fmtNum(stats.rolling12, locale)}</div>
            {stats.rolling12YoYPct !== null && (
              <div className={`text-sm ${stats.rolling12YoYPct >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {fmtPct(stats.rolling12YoYPct)} {t.vsPrevYear}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
              <CalendarDays className="h-3.5 w-3.5" /> {t.latestMonth}
            </div>
            <div className="text-2xl font-bold text-stone-900">{fmtNum(latest.pax_total, locale)}</div>
            <div className="text-sm text-stone-500">
              {periodLabel(uiLoc, latest)}
              {stats.latestYoYPct !== null && (
                <span className={stats.latestYoYPct >= 0 ? " text-emerald-700" : " text-red-700"}>
                  {" "}({fmtPct(stats.latestYoYPct)})
                </span>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
              <CalendarDays className="h-3.5 w-3.5" /> {t.busiest}
            </div>
            <div className="text-2xl font-bold text-stone-900 capitalize">{busyName}</div>
            <div className="text-sm text-stone-500">{fmtNum(busyAvg, locale)} {t.avgPassengers}</div>
          </div>
          {/* aircraft_intl is populated on only 2 of 26 months in the HCAA
              data, which rendered as a misleading "0% international" · show
              the last full calendar year instead, which is solid. */}
          {stats.lastFullYear && (
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
                <Plane className="h-3.5 w-3.5" /> {t.yearTotal(stats.lastFullYear.year)}
              </div>
              <div className="text-2xl font-bold text-stone-900">
                {fmtNum(stats.lastFullYear.pax, locale)}
              </div>
              <div className="text-sm text-stone-500">{t.passengers}</div>
            </div>
          )}
        </section>

        {/* Seasonality */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-stone-900 mb-2">{t.seasonality}</h2>
          <p className="text-stone-600 mb-4">
            {t.seasonalityIntro(city, busyName, quietName)}
          </p>
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <SeasonalityChart stats={stats} uiLoc={uiLoc} />
          </div>
        </section>

        {/* Monthly table */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-stone-900 mb-4">{t.monthlyTable}</h2>
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-500">
                  <th className="px-4 py-3 font-medium">{t.colMonth}</th>
                  <th className="px-4 py-3 font-medium text-right">{t.colPax}</th>
                  <th className="px-4 py-3 font-medium text-right">{t.colYoY}</th>
                </tr>
              </thead>
              <tbody>
                {last13.map(r => {
                  const yoy = yoyFor(r);
                  return (
                    <tr key={`${r.year}-${r.month}`} className="border-b border-stone-100 last:border-0">
                      <td className="px-4 py-2.5 capitalize">{periodLabel(uiLoc, r)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtNum(r.pax_total, locale)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${
                        yoy === null ? "text-stone-400" : yoy >= 0 ? "text-emerald-700" : "text-red-700"
                      }`}>
                        {fmtPct(yoy)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Kastelli note (Heraklion only) */}
        {airport.iata === "HER" && (
          <section className="mb-10 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-lg font-semibold text-stone-900 mb-1.5">{t.kastelliTitle}</h2>
            <p className="text-stone-700">{t.kastelliText}</p>
          </section>
        )}

        {/* Getting there (liens transport). CTA vols Skyscanner RETIRÉ le
            13/06/2026 : associateid=cretedirect = placeholder non tracké (cf
            docs/marketing/2026-06-13-audit-placement-affiliation.md, P1). À
            réintégrer une fois le programme affilié vols réellement inscrit. */}
        <section className="mb-10">
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-stone-900 mb-3">{t.gettingThere}</h2>
            <ul className="space-y-2 text-stone-700">
              {airport.transferRoute && (
                <li>
                  <Link href={`/${locale}/getting-around/${airport.transferRoute}`} className="text-cyan-800 hover:underline">
                    {t.transferLink(city)}
                  </Link>
                </li>
              )}
              <li>
                <Link href={`/${locale}/buses`} className="text-cyan-800 hover:underline">
                  {t.busesLink}
                </Link>
              </li>
            </ul>
          </div>
        </section>

        {/* Encart partenaire location de voiture (wizard interne /car-rental) */}
        <CarPromo locale={locale} pickup={CAR_PICKUP[airport.iata]} source="airport" />

        {/* Staying nearby: airbnb data cross-links */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-stone-900 mb-3">{t.stayingNearby}</h2>
          <ul className="flex flex-wrap gap-2">
            {airport.airbnbSlugs.map(s => (
              <li key={s}>
                <Link
                  href={`/${locale}/airbnb/${s}`}
                  className="inline-block rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-sm text-stone-700 hover:border-stone-500"
                >
                  {t.airbnbLink(s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()))}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-stone-900 mb-4">{t.faqTitle}</h2>
          <div className="space-y-3">
            {faq.map(f => (
              <details key={f.q} className="rounded-xl border border-stone-200 bg-white p-4">
                <summary className="font-medium text-stone-900 cursor-pointer">{f.q}</summary>
                <p className="mt-2 text-stone-700">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Methodology */}
        <section className="rounded-xl bg-stone-100 p-5 text-sm text-stone-600">
          <h2 className="font-semibold text-stone-800 mb-2">{t.methodology}</h2>
          <p>{t.methodologyText(periodLabel(uiLoc, first), periodLabel(uiLoc, latest))}</p>
          {stats.sourceUrl && (
            <p className="mt-2">
              <a href={stats.sourceUrl} rel="noopener noreferrer" target="_blank" className="text-cyan-800 hover:underline">
                {t.sourceLabel}
              </a>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
