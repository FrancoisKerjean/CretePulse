import { ChevronLeft, Wind, Waves, Thermometer, MapPin, AlertTriangle, Bus, CarTaxiFront } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildSwimToday, type ScoredBeach, type ShoreWind } from "@/lib/swim-today";
import { BeachImage } from "@/components/BeachImage";
import { buildAlternates } from "@/lib/seo";
import { getLocalizedField } from "@/lib/types";
import type { Locale } from "@/lib/types";
import { routing } from "@/i18n/routing";

// Weather cache refreshes hourly on the VPS; re-render at most every 30 min.
export const revalidate = 1800;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const SUPPORTED: Locale[] = ["en", "fr", "de", "el"];
const VALID_LOC = (l: string): l is Locale => (SUPPORTED as string[]).includes(l);
const VALID_SITE_LOC = (l: string): boolean =>
  (routing.locales as readonly string[]).includes(l);
const pickUiLoc = (l: string): Locale => (VALID_LOC(l) ? l : "en");

const L: Record<Locale, {
  metaTitle: string;
  metaDesc: (wind: string, speed: string) => string;
  back: string;
  h1: string;
  intro: (wind: string, min: number, max: number) => string;
  pickTitle: string;
  pickWhy: (windCard: string, speed: number, shore: ShoreWind, wave: string, sea: string) => string;
  viewBeach: string;
  byRegionTitle: string;
  regions: Record<string, string>;
  avoidTitle: string;
  avoidNote: string;
  rating: Record<"calm" | "fair" | "exposed", string>;
  shore: Record<ShoreWind, string>;
  gettingThere: string;
  busVia: (stop: string, km: number) => string;
  busSchedules: string;
  noDirectBus: string;
  taxiFrom: (city: string, km: number) => string;
  conditionsTitle: string;
  colCity: string;
  colWind: string;
  colWaves: string;
  colSea: string;
  methodology: string;
  methodologyText: string;
  updated: string;
  faqWhereQ: string;
  faqWhereA: (name: string, region: string, windCard: string, speed: number) => string;
  faqWindyQ: string;
  faqWindyA: (wind: string, min: number, max: number) => string;
}> = {
  en: {
    metaTitle: "Where to swim in Crete today: live wind and sea conditions",
    metaDesc: (wind, speed) =>
      `Today's pick and the calmest beaches in Crete right now, computed from live wind (${wind}, ${speed} km/h), wave and sea data. Updated every 30 minutes.`,
    back: "All beaches",
    h1: "Where to swim in Crete today",
    intro: (wind, min, max) =>
      `Live conditions: ${wind} wind, ${min} to ${max} km/h depending on the coast. We rank Crete's beaches by how calm the water should be right now, from wind direction, shoreline orientation and measured wave height.`,
    pickTitle: "Today's pick",
    pickWhy: (windCard, speed, shore, wave, sea) =>
      shore === "offshore"
        ? `The ${windCard} wind (${speed} km/h) blows from the land here, leaving the shoreline flat. Waves around ${wave}, sea at ${sea}.`
        : shore === "cross"
          ? `The ${windCard} wind (${speed} km/h) runs along the shore here, keeping the water manageable. Waves around ${wave}, sea at ${sea}.`
          : `Even with the ${windCard} wind (${speed} km/h) this is the best balance today. Waves around ${wave}, sea at ${sea}.`,
    viewBeach: "Beach guide",
    byRegionTitle: "Good choices by area",
    regions: { west: "West Crete", central: "Central Crete", east: "East Crete", south: "South coast" },
    avoidTitle: "Exposed today",
    avoidNote: "Onshore wind and chop expected: better another day.",
    rating: { calm: "calm", fair: "fair", exposed: "exposed" },
    shore: { offshore: "offshore wind", cross: "cross-shore wind", onshore: "onshore wind" },
    gettingThere: "Getting there",
    busVia: (stop, km) => `KTEL bus via ${stop} (${km} km)`,
    busSchedules: "Bus schedules",
    noDirectBus: "No KTEL stop nearby: taxi or car",
    taxiFrom: (city, km) => `Taxi: about ${km} km from ${city}`,
    conditionsTitle: "Live conditions by station",
    colCity: "Station",
    colWind: "Wind",
    colWaves: "Waves",
    colSea: "Sea",
    methodology: "How this works",
    methodologyText:
      "Every 30 minutes we combine live Open-Meteo data (wind speed and direction, wave height at the nearest marine point, sea temperature, 10 stations across Crete) with each beach's shoreline orientation, estimated from its position relative to the island's mountain ridge. Offshore or cross-shore wind means flatter water; onshore wind builds chop. Individual bays can behave differently: always judge conditions on site, especially with children.",
    updated: "Conditions updated",
    faqWhereQ: "Where should I swim in Crete today?",
    faqWhereA: (name, region, windCard, speed) =>
      `Today's data pick is ${name} (${region}): with the current ${windCard} wind at ${speed} km/h it is on the sheltered side of the island.`,
    faqWindyQ: "Is it windy in Crete today?",
    faqWindyA: (wind, min, max) =>
      `Right now the wind over Crete blows from the ${wind} at ${min} to ${max} km/h depending on the coast. One side of the island is usually calm whatever the wind: this page lists it live.`,
  },
  fr: {
    metaTitle: "Où se baigner en Crète aujourd'hui : vent et mer en direct",
    metaDesc: (wind, speed) =>
      `La préco du jour et les plages les plus calmes de Crète en ce moment, calculées sur le vent live (${wind}, ${speed} km/h), la houle et la mer. Mis à jour toutes les 30 minutes.`,
    back: "Toutes les plages",
    h1: "Où se baigner en Crète aujourd'hui",
    intro: (wind, min, max) =>
      `Conditions en direct : vent ${wind}, ${min} à ${max} km/h selon la côte. Nous classons les plages de Crète selon le calme attendu de l'eau, à partir de la direction du vent, de l'orientation du rivage et de la houle mesurée.`,
    pickTitle: "La préco du jour",
    pickWhy: (windCard, speed, shore, wave, sea) =>
      shore === "offshore"
        ? `Le vent ${windCard} (${speed} km/h) souffle de la terre ici : bord de mer plat. Houle autour de ${wave}, mer à ${sea}.`
        : shore === "cross"
          ? `Le vent ${windCard} (${speed} km/h) longe le rivage ici : eau praticable. Houle autour de ${wave}, mer à ${sea}.`
          : `Même avec le vent ${windCard} (${speed} km/h), c'est le meilleur compromis du jour. Houle autour de ${wave}, mer à ${sea}.`,
    viewBeach: "Guide de la plage",
    byRegionTitle: "Les bons choix par zone",
    regions: { west: "Crète ouest", central: "Crète centrale", east: "Crète est", south: "Côte sud" },
    avoidTitle: "Exposées aujourd'hui",
    avoidNote: "Vent de mer et clapot attendus : mieux un autre jour.",
    rating: { calm: "calme", fair: "correct", exposed: "exposée" },
    shore: { offshore: "vent de terre", cross: "vent de travers", onshore: "vent de mer" },
    gettingThere: "S'y rendre",
    busVia: (stop, km) => `Bus KTEL via ${stop} (${km} km)`,
    busSchedules: "Horaires de bus",
    noDirectBus: "Pas d'arrêt KTEL à proximité : taxi ou voiture",
    taxiFrom: (city, km) => `Taxi : environ ${km} km depuis ${city}`,
    conditionsTitle: "Conditions en direct par station",
    colCity: "Station",
    colWind: "Vent",
    colWaves: "Houle",
    colSea: "Mer",
    methodology: "Comment ça marche",
    methodologyText:
      "Toutes les 30 minutes, nous croisons les données live Open-Meteo (vitesse et direction du vent, houle au point marin le plus proche, température de la mer, 10 stations en Crète) avec l'orientation du rivage de chaque plage, estimée d'après sa position par rapport à la crête montagneuse de l'île. Vent de terre ou de travers = eau plus plate ; vent de mer = clapot. Chaque baie peut se comporter différemment : jugez toujours les conditions sur place, surtout avec des enfants.",
    updated: "Conditions mises à jour",
    faqWhereQ: "Où se baigner en Crète aujourd'hui ?",
    faqWhereA: (name, region, windCard, speed) =>
      `La préco du jour est ${name} (${region}) : avec le vent ${windCard} actuel à ${speed} km/h, elle est du côté abrité de l'île.`,
    faqWindyQ: "Y a-t-il du vent en Crète aujourd'hui ?",
    faqWindyA: (wind, min, max) =>
      `En ce moment, le vent souffle du ${wind} entre ${min} et ${max} km/h selon la côte. Un côté de l'île reste généralement calme quel que soit le vent : cette page l'indique en direct.`,
  },
  de: {
    metaTitle: "Wo heute auf Kreta baden: Wind und Meer live",
    metaDesc: (wind, speed) =>
      `Der Tagestipp und die ruhigsten Strände Kretas gerade jetzt, berechnet aus Live-Wind (${wind}, ${speed} km/h), Wellen und Meerdaten. Alle 30 Minuten aktualisiert.`,
    back: "Alle Strände",
    h1: "Wo heute auf Kreta baden",
    intro: (wind, min, max) =>
      `Live-Bedingungen: ${wind}-Wind, ${min} bis ${max} km/h je nach Küste. Wir sortieren Kretas Strände nach der erwarteten Ruhe des Wassers, aus Windrichtung, Küstenausrichtung und gemessener Wellenhöhe.`,
    pickTitle: "Tipp des Tages",
    pickWhy: (windCard, speed, shore, wave, sea) =>
      shore === "offshore"
        ? `Der ${windCard}-Wind (${speed} km/h) weht hier vom Land: flaches Wasser am Ufer. Wellen um ${wave}, Meer bei ${sea}.`
        : shore === "cross"
          ? `Der ${windCard}-Wind (${speed} km/h) läuft hier parallel zum Ufer: gut machbar. Wellen um ${wave}, Meer bei ${sea}.`
          : `Auch bei ${windCard}-Wind (${speed} km/h) ist das heute der beste Kompromiss. Wellen um ${wave}, Meer bei ${sea}.`,
    viewBeach: "Strandguide",
    byRegionTitle: "Gute Optionen nach Gebiet",
    regions: { west: "Westkreta", central: "Zentralkreta", east: "Ostkreta", south: "Südküste" },
    avoidTitle: "Heute exponiert",
    avoidNote: "Auflandiger Wind und Wellen erwartet: besser an einem anderen Tag.",
    rating: { calm: "ruhig", fair: "machbar", exposed: "exponiert" },
    shore: { offshore: "ablandiger Wind", cross: "Seitenwind", onshore: "auflandiger Wind" },
    gettingThere: "Anreise",
    busVia: (stop, km) => `KTEL-Bus über ${stop} (${km} km)`,
    busSchedules: "Busfahrpläne",
    noDirectBus: "Keine KTEL-Haltestelle in der Nähe: Taxi oder Auto",
    taxiFrom: (city, km) => `Taxi: etwa ${km} km ab ${city}`,
    conditionsTitle: "Live-Bedingungen je Station",
    colCity: "Station",
    colWind: "Wind",
    colWaves: "Wellen",
    colSea: "Meer",
    methodology: "So funktioniert es",
    methodologyText:
      "Alle 30 Minuten kombinieren wir Live-Daten von Open-Meteo (Windgeschwindigkeit und -richtung, Wellenhöhe am nächsten Meerespunkt, Wassertemperatur, 10 Stationen auf Kreta) mit der Ausrichtung jedes Strandes, geschätzt aus seiner Lage zur Bergkette der Insel. Ablandiger oder seitlicher Wind bedeutet flacheres Wasser; auflandiger Wind baut Wellen auf. Einzelne Buchten können abweichen: Bedingungen immer vor Ort prüfen, besonders mit Kindern.",
    updated: "Bedingungen aktualisiert",
    faqWhereQ: "Wo sollte man heute auf Kreta baden?",
    faqWhereA: (name, region, windCard, speed) =>
      `Der Daten-Tipp des Tages ist ${name} (${region}): beim aktuellen ${windCard}-Wind mit ${speed} km/h liegt er auf der geschützten Seite der Insel.`,
    faqWindyQ: "Ist es heute windig auf Kreta?",
    faqWindyA: (wind, min, max) =>
      `Aktuell weht der Wind über Kreta aus ${wind} mit ${min} bis ${max} km/h je nach Küste. Eine Seite der Insel bleibt meist ruhig: diese Seite zeigt sie live.`,
  },
  el: {
    metaTitle: "Πού για μπάνιο στην Κρήτη σήμερα: άνεμος και θάλασσα live",
    metaDesc: (wind, speed) =>
      `Η πρόταση της ημέρας και οι πιο ήρεμες παραλίες της Κρήτης αυτή τη στιγμή, υπολογισμένες από live άνεμο (${wind}, ${speed} χλμ/ώρα), κυματισμό και θάλασσα. Ενημέρωση κάθε 30 λεπτά.`,
    back: "Όλες οι παραλίες",
    h1: "Πού για μπάνιο στην Κρήτη σήμερα",
    intro: (wind, min, max) =>
      `Συνθήκες σε πραγματικό χρόνο: άνεμος ${wind}, ${min} έως ${max} χλμ/ώρα ανάλογα με την ακτή. Κατατάσσουμε τις παραλίες της Κρήτης με βάση την αναμενόμενη ηρεμία του νερού, από τη διεύθυνση του ανέμου, τον προσανατολισμό της ακτής και τον μετρημένο κυματισμό.`,
    pickTitle: "Η πρόταση της ημέρας",
    pickWhy: (windCard, speed, shore, wave, sea) =>
      shore === "offshore"
        ? `Ο ${windCard} άνεμος (${speed} χλμ/ώρα) φυσά από τη στεριά εδώ: ήρεμα νερά στην ακτή. Κυματισμός γύρω στο ${wave}, θάλασσα στους ${sea}.`
        : shore === "cross"
          ? `Ο ${windCard} άνεμος (${speed} χλμ/ώρα) κινείται παράλληλα στην ακτή: βατά νερά. Κυματισμός γύρω στο ${wave}, θάλασσα στους ${sea}.`
          : `Ακόμα και με τον ${windCard} άνεμο (${speed} χλμ/ώρα), είναι η καλύτερη επιλογή σήμερα. Κυματισμός γύρω στο ${wave}, θάλασσα στους ${sea}.`,
    viewBeach: "Οδηγός παραλίας",
    byRegionTitle: "Καλές επιλογές ανά περιοχή",
    regions: { west: "Δυτική Κρήτη", central: "Κεντρική Κρήτη", east: "Ανατολική Κρήτη", south: "Νότια ακτή" },
    avoidTitle: "Εκτεθειμένες σήμερα",
    avoidNote: "Αναμένεται θαλάσσιος άνεμος και κυματισμός: καλύτερα άλλη μέρα.",
    rating: { calm: "ήρεμη", fair: "βατή", exposed: "εκτεθειμένη" },
    shore: { offshore: "απόγειος άνεμος", cross: "πλάγιος άνεμος", onshore: "θαλάσσιος άνεμος" },
    gettingThere: "Μετάβαση",
    busVia: (stop, km) => `Λεωφορείο ΚΤΕΛ μέσω ${stop} (${km} χλμ)`,
    busSchedules: "Δρομολόγια λεωφορείων",
    noDirectBus: "Χωρίς στάση ΚΤΕΛ κοντά: ταξί ή αυτοκίνητο",
    taxiFrom: (city, km) => `Ταξί: περίπου ${km} χλμ από ${city}`,
    conditionsTitle: "Συνθήκες live ανά σταθμό",
    colCity: "Σταθμός",
    colWind: "Άνεμος",
    colWaves: "Κύμα",
    colSea: "Θάλασσα",
    methodology: "Πώς λειτουργεί",
    methodologyText:
      "Κάθε 30 λεπτά συνδυάζουμε live δεδομένα Open-Meteo (ταχύτητα και διεύθυνση ανέμου, ύψος κύματος στο πλησιέστερο θαλάσσιο σημείο, θερμοκρασία θάλασσας, 10 σταθμοί στην Κρήτη) με τον προσανατολισμό κάθε παραλίας, εκτιμημένο από τη θέση της σε σχέση με την οροσειρά του νησιού. Απόγειος ή πλάγιος άνεμος σημαίνει πιο ήρεμα νερά· θαλάσσιος άνεμος φέρνει κυματισμό. Κάθε κόλπος μπορεί να διαφέρει: κρίνετε πάντα τις συνθήκες επί τόπου, ειδικά με παιδιά.",
    updated: "Ενημέρωση συνθηκών",
    faqWhereQ: "Πού να πάω για μπάνιο στην Κρήτη σήμερα;",
    faqWhereA: (name, region, windCard, speed) =>
      `Η πρόταση της ημέρας είναι ${name} (${region}): με τον τρέχοντα ${windCard} άνεμο στα ${speed} χλμ/ώρα βρίσκεται στην προστατευμένη πλευρά του νησιού.`,
    faqWindyQ: "Φυσάει σήμερα στην Κρήτη;",
    faqWindyA: (wind, min, max) =>
      `Αυτή τη στιγμή ο άνεμος πνέει από ${wind} με ${min} έως ${max} χλμ/ώρα ανάλογα με την ακτή. Μία πλευρά του νησιού μένει συνήθως ήρεμη: αυτή η σελίδα τη δείχνει live.`,
  },
};

const RATING_CLASS: Record<"calm" | "fair" | "exposed", string> = {
  calm: "bg-emerald-100 text-emerald-800",
  fair: "bg-amber-100 text-amber-800",
  exposed: "bg-red-100 text-red-700",
};

function fmtWave(v: number | null): string {
  return v === null ? "-" : `${v.toFixed(1)} m`;
}
function fmtSea(v: number | null): string {
  return v === null ? "-" : `${Math.round(v)}°C`;
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
  const data = await buildSwimToday();
  const speed = data ? `${data.wind.minSpeed}-${data.wind.maxSpeed}` : "10-30";
  const wind = data?.wind.cardinal ?? "N";
  return {
    title: t.metaTitle,
    description: t.metaDesc(wind, speed),
    alternates: buildAlternates(locale, "/beaches/today"),
    openGraph: {
      title: t.metaTitle,
      description: t.metaDesc(wind, speed),
      url: `${BASE_URL}/${locale}/beaches/today`,
    },
  };
}

function BeachRow({ s, locale, uiLoc }: { s: ScoredBeach; locale: string; uiLoc: Locale }) {
  const t = L[uiLoc];
  const name = getLocalizedField(s.beach, "name", uiLoc);
  return (
    <Link
      href={`/${locale}/beaches/${s.beach.slug}`}
      className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-400 transition-colors"
    >
      <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0">
        <BeachImage src={s.beach.image_url} alt={name} className="w-16 h-12 object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-stone-900 truncate">{name}</p>
        <p className="text-xs text-stone-500">
          {t.shore[s.shoreWind]} · {s.windSpeed} km/h · {fmtWave(s.waveHeight)}
        </p>
        {s.busStop?.hasDirectBus && (
          <p className="text-xs text-stone-400 inline-flex items-center gap-1">
            <Bus className="h-3 w-3" /> {s.busStop.name} · {s.busStop.km} km
          </p>
        )}
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${RATING_CLASS[s.rating]}`}>
        {t.rating[s.rating]}
      </span>
    </Link>
  );
}

export default async function SwimTodayPage(
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!VALID_SITE_LOC(locale)) return notFound();

  const uiLoc = pickUiLoc(locale);
  const t = L[uiLoc];
  const data = await buildSwimToday();
  if (!data) return notFound();

  const pick = data.pick;
  const pickName = getLocalizedField(pick.beach, "name", uiLoc);
  const pickRegion = t.regions[pick.beach.region] ?? pick.beach.region;
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat(uiLoc, {
    weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Athens",
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat(uiLoc, {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Athens",
  }).format(now);

  const faq = [
    {
      q: t.faqWhereQ,
      a: t.faqWhereA(pickName, pickRegion, pick.windCardinal, pick.windSpeed),
    },
    {
      q: t.faqWindyQ,
      a: t.faqWindyA(data.wind.cardinal, data.wind.minSpeed, data.wind.maxSpeed),
    },
  ];

  const pageUrl = `${BASE_URL}/${locale}/beaches/today`;
  const topList = [pick, ...Object.values(data.byRegion).flat()].slice(0, 10);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: t.metaTitle,
        description: t.metaDesc(data.wind.cardinal, `${data.wind.minSpeed}-${data.wind.maxSpeed}`),
        url: pageUrl,
        dateModified: now.toISOString(),
      },
      {
        "@type": "ItemList",
        name: t.byRegionTitle,
        itemListElement: topList.map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: getLocalizedField(s.beach, "name", uiLoc),
          url: `${BASE_URL}/${locale}/beaches/${s.beach.slug}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map(f => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
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
          href={`/${locale}/beaches`}
          className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.back}
        </Link>

        <header className="mb-8">
          <p className="text-sm text-stone-500 capitalize">{dateLabel}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mt-1">{t.h1}</h1>
          <p className="mt-3 text-stone-600 max-w-3xl">
            {t.intro(data.wind.cardinal, data.wind.minSpeed, data.wind.maxSpeed)}
          </p>
        </header>

        {/* Today's pick */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-stone-800 mb-3">{t.pickTitle}</h2>
          <Link
            href={`/${locale}/beaches/${pick.beach.slug}`}
            className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white hover:border-stone-400 transition-colors md:grid md:grid-cols-2"
          >
            <div className="relative h-56 md:h-full min-h-56 overflow-hidden">
              <BeachImage
                src={pick.beach.image_url}
                alt={pickName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-5 md:p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-sm text-stone-500 mb-1.5">
                <MapPin className="h-4 w-4" /> {pickRegion}
              </div>
              <p className="text-2xl font-bold text-stone-900">{pickName}</p>
              <p className="mt-2 text-stone-600">
                {t.pickWhy(pick.windCardinal, pick.windSpeed, pick.shoreWind, fmtWave(pick.waveHeight), fmtSea(pick.seaTemp))}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700">
                  <Wind className="h-3.5 w-3.5" /> {t.shore[pick.shoreWind]} · {pick.windSpeed} km/h
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700">
                  <Waves className="h-3.5 w-3.5" /> {fmtWave(pick.waveHeight)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700">
                  <Thermometer className="h-3.5 w-3.5" /> {fmtSea(pick.seaTemp)}
                </span>
              </div>
              <span className="mt-4 text-sm font-medium text-cyan-800">{t.viewBeach} →</span>
            </div>
          </Link>

          {/* Getting there: nearest KTEL stop + taxi distance reference */}
          <div className="mt-3 rounded-xl border border-stone-200 bg-white px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="font-medium text-stone-700">{t.gettingThere}</span>
            <span className="inline-flex items-center gap-1.5 text-stone-700">
              <Bus className="h-4 w-4 text-cyan-800" />
              {pick.busStop?.hasDirectBus
                ? t.busVia(pick.busStop.name, pick.busStop.km)
                : t.noDirectBus}
            </span>
            <span className="inline-flex items-center gap-1.5 text-stone-700">
              <CarTaxiFront className="h-4 w-4 text-stone-500" />
              {pick.busStop
                ? t.taxiFrom(pick.busStop.name, Math.round(pick.busStop.km))
                : t.taxiFrom(pick.city.name, pick.cityKm)}
            </span>
            <Link href={`/${locale}/buses`} className="text-cyan-800 hover:underline font-medium">
              {t.busSchedules} →
            </Link>
          </div>
        </section>

        {/* Good choices by area */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-stone-800 mb-3">{t.byRegionTitle}</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {Object.entries(data.byRegion).map(([region, list]) =>
              list.length > 0 ? (
                <div key={region}>
                  <h3 className="text-sm font-medium text-stone-500 mb-2">
                    {t.regions[region] ?? region}
                  </h3>
                  <div className="space-y-2">
                    {list.map(s => (
                      <BeachRow key={s.beach.slug} s={s} locale={locale} uiLoc={uiLoc} />
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </section>

        {/* Exposed today */}
        {data.avoid.length > 0 && (
          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-800 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> {t.avoidTitle}
            </h2>
            <p className="text-sm text-stone-500 mb-3">{t.avoidNote}</p>
            <div className="grid md:grid-cols-2 gap-2">
              {data.avoid.map(s => (
                <BeachRow key={s.beach.slug} s={s} locale={locale} uiLoc={uiLoc} />
              ))}
            </div>
          </section>
        )}

        {/* Live conditions table */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-stone-800 mb-3">{t.conditionsTitle}</h2>
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-500">
                  <th className="px-4 py-2.5 font-medium">{t.colCity}</th>
                  <th className="px-4 py-2.5 font-medium text-right">{t.colWind}</th>
                  <th className="px-4 py-2.5 font-medium text-right">{t.colWaves}</th>
                  <th className="px-4 py-2.5 font-medium text-right">{t.colSea}</th>
                </tr>
              </thead>
              <tbody>
                {data.cities.map(c => (
                  <tr key={c.name} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-2">{c.name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {c.windSpeed} km/h
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtWave(c.waveHeight)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtSea(c.seaTemp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ (visible, matches JSON-LD) */}
        <section className="mb-10 space-y-3">
          {faq.map(f => (
            <details key={f.q} className="rounded-xl border border-stone-200 bg-white p-4">
              <summary className="font-medium text-stone-900 cursor-pointer">{f.q}</summary>
              <p className="mt-2 text-stone-700">{f.a}</p>
            </details>
          ))}
        </section>

        {/* Methodology */}
        <section className="rounded-xl bg-stone-100 p-5 text-sm text-stone-600">
          <h2 className="font-semibold text-stone-800 mb-2">{t.methodology}</h2>
          <p>{t.methodologyText}</p>
          <p className="mt-2 text-xs text-stone-500">
            {t.updated}: {dateLabel}, {timeLabel} (Europe/Athens)
          </p>
        </section>
      </div>
    </main>
  );
}
