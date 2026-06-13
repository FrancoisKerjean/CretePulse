import { Wind, Waves, Thermometer, MapPin, AlertTriangle, Bus, CarTaxiFront, Star, Anchor, Users } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildSwimToday, type ScoredBeach, type ShoreWind } from "@/lib/swim-today";
import { BeachImage } from "@/components/BeachImage";
import { RegionPicker, type RegionBeachLite, type ZoneKey } from "@/components/RegionPicker";
import { NearestSwimSpot, type NearestSwimBeach } from "@/components/near-me/NearestSwimSpot";
import { CarPromo } from "@/components/car-rental/CarPromo";
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
      "Every 30 minutes we combine live Open-Meteo data (wind speed and direction, wave height at the nearest marine point, sea temperature, 10 stations across Crete) with each beach's shoreline orientation, estimated from its position relative to the island's mountain ridge. Offshore or cross-shore wind means flatter water; onshore wind builds chop. Individual bays can behave differently: always judge conditions on site, especially with children. For 180 of the 183 beaches, field-observed data (typical sea state of the bay, sand type, depth, crowds) corrects the geometric estimate: a bay known usually calm scores better than its exposure alone suggests.",
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
      "Toutes les 30 minutes, nous croisons les données live Open-Meteo (vitesse et direction du vent, houle au point marin le plus proche, température de la mer, 10 stations en Crète) avec l'orientation du rivage de chaque plage, estimée d'après sa position par rapport à la crête montagneuse de l'île. Vent de terre ou de travers = eau plus plate ; vent de mer = clapot. Chaque baie peut se comporter différemment : jugez toujours les conditions sur place, surtout avec des enfants. Pour 180 des 183 plages, des données observées sur le terrain (état de mer habituel de la baie, type de sable, profondeur, affluence) corrigent l'estimation géométrique : une baie réputée calme score mieux que sa seule exposition ne le suggère.",
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
      "Alle 30 Minuten kombinieren wir Live-Daten von Open-Meteo (Windgeschwindigkeit und -richtung, Wellenhöhe am nächsten Meerespunkt, Wassertemperatur, 10 Stationen auf Kreta) mit der Ausrichtung jedes Strandes, geschätzt aus seiner Lage zur Bergkette der Insel. Ablandiger oder seitlicher Wind bedeutet flacheres Wasser; auflandiger Wind baut Wellen auf. Einzelne Buchten können abweichen: Bedingungen immer vor Ort prüfen, besonders mit Kindern. Für 180 der 183 Strände korrigieren vor Ort beobachtete Daten (typischer Seegang der Bucht, Sandtyp, Tiefe, Andrang) die geometrische Schätzung: eine als ruhig bekannte Bucht erzielt einen besseren Wert, als ihre Exposition allein vermuten lässt.",
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
      "Κάθε 30 λεπτά συνδυάζουμε live δεδομένα Open-Meteo (ταχύτητα και διεύθυνση ανέμου, ύψος κύματος στο πλησιέστερο θαλάσσιο σημείο, θερμοκρασία θάλασσας, 10 σταθμοί στην Κρήτη) με τον προσανατολισμό κάθε παραλίας, εκτιμημένο από τη θέση της σε σχέση με την οροσειρά του νησιού. Απόγειος ή πλάγιος άνεμος σημαίνει πιο ήρεμα νερά· θαλάσσιος άνεμος φέρνει κυματισμό. Κάθε κόλπος μπορεί να διαφέρει: κρίνετε πάντα τις συνθήκες επί τόπου, ειδικά με παιδιά. Για 180 από τις 183 παραλίες, δεδομένα πεδίου (συνήθης κατάσταση θάλασσας του κόλπου, τύπος άμμου, βάθος, κίνηση) διορθώνουν τη γεωμετρική εκτίμηση: ένας κόλπος γνωστός ως ήρεμος βαθμολογείται καλύτερα από όσο υποδηλώνει μόνο η έκθεσή του.",
    updated: "Ενημέρωση συνθηκών",
    faqWhereQ: "Πού να πάω για μπάνιο στην Κρήτη σήμερα;",
    faqWhereA: (name, region, windCard, speed) =>
      `Η πρόταση της ημέρας είναι ${name} (${region}): με τον τρέχοντα ${windCard} άνεμο στα ${speed} χλμ/ώρα βρίσκεται στην προστατευμένη πλευρά του νησιού.`,
    faqWindyQ: "Φυσάει σήμερα στην Κρήτη;",
    faqWindyA: (wind, min, max) =>
      `Αυτή τη στιγμή ο άνεμος πνέει από ${wind} με ${min} έως ${max} χλμ/ώρα ανάλογα με την ακτή. Μία πλευρά του νησιού μένει συνήθως ήρεμη: αυτή η σελίδα τη δείχνει live.`,
  },
};

// Field-observed attribute values (cb_places dataset) -> localized labels.
// Values may be comma-separated ("Sand, Pebbles"): the first token decides.
const SAND_LABELS: Record<Locale, Record<string, string>> = {
  en: { "Sand": "sand", "Fine Pebbles": "fine pebbles", "Pebbles": "pebbles", "Rocks": "rocks", "Rocks in places": "rocky in places" },
  fr: { "Sand": "sable", "Fine Pebbles": "galets fins", "Pebbles": "galets", "Rocks": "rochers", "Rocks in places": "rocheux par endroits" },
  de: { "Sand": "Sand", "Fine Pebbles": "feine Kiesel", "Pebbles": "Kiesel", "Rocks": "Felsen", "Rocks in places": "stellenweise felsig" },
  el: { "Sand": "άμμος", "Fine Pebbles": "ψιλό βότσαλο", "Pebbles": "βότσαλο", "Rocks": "βράχια", "Rocks in places": "βραχώδης κατά τόπους" },
};
const DEPTH_LABELS: Record<Locale, Record<string, string>> = {
  en: { "Shallow": "shallow water", "Normal": "normal depth", "Deep": "deep water" },
  fr: { "Shallow": "eau peu profonde", "Normal": "profondeur normale", "Deep": "eau profonde" },
  de: { "Shallow": "flaches Wasser", "Normal": "normale Tiefe", "Deep": "tiefes Wasser" },
  el: { "Shallow": "ρηχά νερά", "Normal": "κανονικό βάθος", "Deep": "βαθιά νερά" },
};
const CROWD_LABELS: Record<Locale, Record<string, string>> = {
  en: { "None": "deserted", "Quiet": "quiet", "Normal": "moderate crowds", "Crowded": "crowded" },
  fr: { "None": "déserte", "Quiet": "tranquille", "Normal": "fréquentation modérée", "Crowded": "fréquentée" },
  de: { "None": "menschenleer", "Quiet": "ruhig", "Normal": "mäßig besucht", "Crowded": "gut besucht" },
  el: { "None": "ερημική", "Quiet": "ήσυχη", "Normal": "μέτρια κίνηση", "Crowded": "πολυσύχναστη" },
};
const KNOWN_CALM: Record<Locale, string> = {
  en: "bay usually calm",
  fr: "baie habituellement calme",
  de: "Bucht meist ruhig",
  el: "συνήθως ήρεμος κόλπος",
};

function attrLabel(raw: string | null | undefined, dict: Record<string, string>): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0].trim();
  return dict[first] ?? null;
}

// Libelles du selecteur de zones (RegionPicker)
const PICKER_ALL: Record<Locale, string> = { en: "All", fr: "Toutes", de: "Alle", el: "Όλες" };
const PICKER_HINT: Record<Locale, string> = {
  en: "Touch a zone of the island · or use the pills",
  fr: "Touche une zone de l'île · ou utilise les pills",
  de: "Tippe eine Zone der Insel an · oder nutze die Pills",
  el: "Άγγιξε μια ζώνη του νησιού · ή χρησιμοποίησε τα κουμπιά",
};

const RATING_CLASS: Record<"calm" | "fair" | "exposed", string> = {
  calm: "bg-[rgba(20,184,107,.13)] text-[#0B8A52]",
  fair: "bg-sun/20 text-[#8A6A14]",
  exposed: "bg-terra/15 text-[#B84B30]",
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
      className="flex items-center gap-3.5 rounded-3xl bg-white p-3 shadow-[0_12px_30px_rgba(11,94,120,.10)] hover:shadow-[0_14px_36px_rgba(11,94,120,.16)] transition-shadow no-underline"
    >
      <div className="relative w-16 h-12 rounded-2xl overflow-hidden shrink-0">
        <BeachImage src={s.imageUrl} alt={name} className="w-16 h-12 object-cover saturate-[1.08]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading font-bold text-text truncate m-0">
          {name}
          {s.cb?.rating != null && s.cb.rating >= 3.5 && (
            <span className="ml-2 inline-flex items-center gap-0.5 text-xs font-semibold text-[#8A6A14]">
              <Star className="h-3 w-3 fill-current" /> {s.cb.rating.toFixed(1)}
            </span>
          )}
        </p>
        <p className="text-xs text-text-muted m-0 font-data">
          {t.shore[s.shoreWind]} · {s.windSpeed} km/h · {fmtWave(s.waveHeight)}
          {attrLabel(s.cb?.sand_type, SAND_LABELS[uiLoc]) ? ` · ${attrLabel(s.cb?.sand_type, SAND_LABELS[uiLoc])}` : ""}
        </p>
        {s.busStop?.hasDirectBus && (
          <p className="text-xs text-text-light inline-flex items-center gap-1 m-0">
            <Bus className="h-3 w-3" /> {s.busStop.name} · {s.busStop.km} km
          </p>
        )}
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold font-data ${RATING_CLASS[s.rating]}`}>
        ≈ {t.rating[s.rating]}
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

  const h1Words = t.h1.split(" ");
  const h1Pre = h1Words.slice(0, -1).join(" ");
  const h1Hl = h1Words[h1Words.length - 1];

  // Donnees serialisables pour la carte selecteur de zones (client)
  const toLite = (s: ScoredBeach): RegionBeachLite => {
    const sand = attrLabel(s.cb?.sand_type, SAND_LABELS[uiLoc]);
    return {
      name: getLocalizedField(s.beach, "name", uiLoc),
      slug: s.beach.slug,
      imageUrl: s.imageUrl,
      rating: s.rating,
      metaLine: `${t.shore[s.shoreWind]} · ${s.windSpeed} km/h · ${fmtWave(s.waveHeight)}${sand ? ` · ${sand}` : ""}`,
      busLine: s.busStop?.hasDirectBus ? `${s.busStop.name} · ${s.busStop.km} km` : null,
      starRating: s.cb?.rating != null && s.cb.rating >= 3.5 ? s.cb.rating : null,
      lat: s.beach.latitude,
      lng: s.beach.longitude,
    };
  };
  const pickerZones = Object.fromEntries(
    (["west", "central", "east", "south"] as ZoneKey[]).map((z) => [z, (data.byRegion[z] ?? []).map(toLite)]),
  ) as Record<ZoneKey, RegionBeachLite[]>;

  // Payload réduit pour l'île client NearestSwimSpot : plages non exposées
  // aujourd'hui, champs minimum (le tri par distance se fait au clic, client).
  const nearestCandidates: NearestSwimBeach[] = data.scored
    .filter((s) => s.rating !== "exposed")
    .map((s) => ({
      slug: s.beach.slug,
      name: getLocalizedField(s.beach, "name", uiLoc),
      latitude: s.beach.latitude,
      longitude: s.beach.longitude,
      score: s.score,
      rating: s.rating as "calm" | "fair",
      imageUrl: s.imageUrl,
    }));

  return (
    <main className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero lagon : greet + h1 + intro + pick-card (docs/design/kalimera/beach.html) */}
      <section className="relative -mt-[74px] pt-28 pb-24 bg-gradient-to-b from-sky via-[#8FE0EC] to-lagoon overflow-hidden">
        <div
          className="absolute top-20 right-[9%] w-[110px] h-[110px] rounded-full shadow-[0_0_70px_20px_rgba(255,200,61,.45)]"
          style={{ background: "radial-gradient(circle at 38% 35%, #FFE08F, #FFC83D 70%)" }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-4 grid lg:grid-cols-2 gap-11 items-center">
          <div>
            <span className="inline-flex items-center gap-2 bg-white/72 rounded-full px-4 py-2 text-[12.5px] font-heading font-bold text-aegean capitalize">
              <span className="w-2 h-2 rounded-full bg-ok shadow-[0_0_0_4px_rgba(20,184,107,.25)]" />
              {dateLabel} · {timeLabel}
            </span>
            <h1 className="font-heading font-extrabold text-4xl md:text-[50px] leading-[1.05] tracking-tight text-text mt-4 mb-3">
              {h1Pre} <span className="text-white [text-shadow:0_2px_16px_rgba(11,94,120,.35)]">{h1Hl}</span>
            </h1>
            <p className="text-[15.5px] text-[rgba(11,57,84,.78)] max-w-md leading-relaxed m-0">
              {t.intro(data.wind.cardinal, data.wind.minSpeed, data.wind.maxSpeed)}
            </p>
            <Link
              href={`/${locale}/beaches`}
              className="inline-flex mt-5 bg-white/80 rounded-full px-4 py-2 text-[13px] font-heading font-bold text-aegean no-underline hover:bg-white transition-colors"
            >
              {t.back}
            </Link>
          </div>

          <Link
            href={`/${locale}/beaches/${pick.beach.slug}`}
            className="block bg-white rounded-[30px] overflow-hidden shadow-[0_22px_54px_rgba(7,55,74,.28)] no-underline group"
          >
            <div className="relative h-[230px] overflow-hidden">
              <BeachImage
                src={pick.imageUrl}
                alt={pickName}
                className="w-full h-full object-cover saturate-[1.08] group-hover:scale-[1.03] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-lagoon/5 via-transparent to-night/30 pointer-events-none" />
            </div>
            <div className="px-5.5 py-4 flex justify-between items-center gap-3.5">
              <div>
                <p className="font-heading font-bold text-[21px] text-text m-0">{pickName}</p>
                <p className="text-xs text-text-muted m-0">{pickRegion} · {pick.city.name} · {t.pickTitle.toLowerCase()}</p>
              </div>
              <span className="bg-[rgba(20,184,107,.14)] text-[#0B8A52] font-extrabold rounded-full px-4 py-2 text-[13px] font-data whitespace-nowrap">
                ≈ {t.rating[pick.rating]}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4.5 gap-y-1 border-t border-text/8 px-5.5 py-3 text-[13px] text-text-muted font-data">
              <span><Wind className="inline h-3.5 w-3.5 mr-1" /><b className="text-text">{pick.windCardinal} {pick.windSpeed} km/h</b></span>
              <span><Thermometer className="inline h-3.5 w-3.5 mr-1" /><b className="text-text">{fmtSea(pick.seaTemp)}</b></span>
              <span><Waves className="inline h-3.5 w-3.5 mr-1" /><b className="text-text">{fmtWave(pick.waveHeight)}</b></span>
              {pick.busStop?.hasDirectBus && (
                <span><Bus className="inline h-3.5 w-3.5 mr-1" /><b className="text-text">{pick.busStop.km} km</b></span>
              )}
            </div>
          </Link>
        </div>
        <svg className="absolute bottom-0 left-0 w-full h-[70px]" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden>
          <path d="M0 40 C180 0 320 70 540 42 C760 14 900 66 1130 40 C1290 22 1380 36 1440 28 L1440 70 L0 70 Z" fill="#F6FBFC" />
        </svg>
      </section>

      <div className="mx-auto max-w-5xl px-4 pt-8 pb-12">
        {/* Pourquoi cette plage : argumentaire + attributs terrain + s'y rendre */}
        <section className="mb-10 rounded-[28px] bg-white px-7 py-6 shadow-[0_12px_32px_rgba(11,94,120,.10)]">
          <div className="flex items-center gap-2 text-sm text-text-muted mb-1.5">
            <MapPin className="h-4 w-4" /> {pickRegion}
          </div>
          <p className="text-[17px] text-text m-0">
            {t.pickWhy(pick.windCardinal, pick.windSpeed, pick.shoreWind, fmtWave(pick.waveHeight), fmtSea(pick.seaTemp))}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {pick.cb?.sea_surface?.toLowerCase().includes("calm") && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(20,184,107,.13)] px-3.5 py-1.5 text-xs text-[#0B8A52] font-bold">
                <Anchor className="h-3.5 w-3.5" /> {KNOWN_CALM[uiLoc]}
              </span>
            )}
            {attrLabel(pick.cb?.sand_type, SAND_LABELS[uiLoc]) && (
              <span className="inline-flex items-center rounded-full bg-stone px-3.5 py-1.5 text-xs text-text-muted font-semibold">
                {attrLabel(pick.cb?.sand_type, SAND_LABELS[uiLoc])}
              </span>
            )}
            {attrLabel(pick.cb?.depth, DEPTH_LABELS[uiLoc]) && (
              <span className="inline-flex items-center rounded-full bg-stone px-3.5 py-1.5 text-xs text-text-muted font-semibold">
                {attrLabel(pick.cb?.depth, DEPTH_LABELS[uiLoc])}
              </span>
            )}
            {attrLabel(pick.cb?.crowds, CROWD_LABELS[uiLoc]) && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-stone px-3.5 py-1.5 text-xs text-text-muted font-semibold">
                <Users className="h-3.5 w-3.5" /> {attrLabel(pick.cb?.crowds, CROWD_LABELS[uiLoc])}
              </span>
            )}
            {pick.cb?.rating != null && pick.cb.rating > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sun/20 px-3.5 py-1.5 text-xs font-bold text-[#8A6A14]">
                <Star className="h-3.5 w-3.5 fill-current" /> {pick.cb.rating.toFixed(1)}/5
              </span>
            )}
          </div>
          <div className="mt-5 pt-4 border-t border-text/8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="font-heading font-bold text-text">{t.gettingThere}</span>
            <span className="inline-flex items-center gap-1.5 text-text-muted">
              <Bus className="h-4 w-4 text-lagoon-deep" />
              {pick.busStop?.hasDirectBus
                ? t.busVia(pick.busStop.name, pick.busStop.km)
                : t.noDirectBus}
            </span>
            <span className="inline-flex items-center gap-1.5 text-text-muted">
              <CarTaxiFront className="h-4 w-4 text-text-light" />
              {pick.busStop
                ? t.taxiFrom(pick.busStop.name, Math.round(pick.busStop.km))
                : t.taxiFrom(pick.city.name, pick.cityKm)}
            </span>
            <Link href={`/${locale}/buses`} className="bg-sun text-text rounded-full px-4 py-2 text-[13px] font-heading font-bold no-underline hover:brightness-105 transition-all">
              {t.busSchedules}
            </Link>
            <Link href={`/${locale}/beaches/${pick.beach.slug}`} className="text-lagoon-deep font-bold hover:underline">
              {t.viewBeach}
            </Link>
          </div>
        </section>

        {/* Monétisation (audit 13/06/2026, A2) : la préco du jour est souvent
            une plage sans bus direct ("taxi ou voiture" ci-dessus) → intention
            voiture. Auto Smart primaire (CarPromo → wizard). */}
        <CarPromo locale={locale} source="beaches-today" />

        {/* La plage calme la plus proche (géoloc client, activée au clic) */}
        <div className="mt-10">
          <NearestSwimSpot locale={locale} beaches={nearestCandidates} />
        </div>

        {/* Good choices by area : carte cliquable zones detourees (mockup valide Kami 12/06) */}
        <section className="mb-10">
          <h2 className="font-heading font-extrabold text-[28px] text-text mb-4">{t.byRegionTitle}</h2>
          <RegionPicker
            zones={pickerZones}
            regionLabels={t.regions}
            allLabel={PICKER_ALL[uiLoc]}
            hint={PICKER_HINT[uiLoc]}
            ratingLabels={t.rating}
            locale={locale}
          />
        </section>

        {/* Exposed today */}
        {data.avoid.length > 0 && (
          <section className="mb-10">
            <h2 className="flex items-center gap-2 font-heading font-extrabold text-[22px] text-text mb-1">
              <AlertTriangle className="h-5 w-5 text-[#B84B30]" /> {t.avoidTitle}
            </h2>
            <p className="text-sm text-text-muted mb-3.5">{t.avoidNote}</p>
            <div className="grid md:grid-cols-2 gap-3">
              {data.avoid.map(s => (
                <BeachRow key={s.beach.slug} s={s} locale={locale} uiLoc={uiLoc} />
              ))}
            </div>
          </section>
        )}

        {/* Conditions par station : bandeau nuit (st-grid du mockup) */}
        <section className="mb-10 bg-night rounded-[32px] text-[#EAF7FA] px-8 py-6">
          <div className="flex justify-between items-baseline mb-3.5">
            <h2 className="font-heading font-bold text-xl m-0">{t.conditionsTitle}</h2>
            <span className="text-xs text-[#EAF7FA]/50 font-data">live · {timeLabel}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 font-data">
            {data.cities.map(c => (
              <div key={c.name} className="bg-[#EAF7FA]/7 rounded-[18px] px-4 py-3">
                <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-lagoon m-0">{c.name}</p>
                <p className="text-[21px] font-bold m-0 mt-0.5">{Math.round(c.temp)}°</p>
                <p className="text-[11.5px] text-[#EAF7FA]/60 m-0">
                  {c.windSpeed} km/h · {fmtWave(c.waveHeight)} · {fmtSea(c.seaTemp)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ (visible, matches JSON-LD) */}
        <section className="mb-10 space-y-3">
          {faq.map(f => (
            <details key={f.q} className="rounded-3xl bg-white p-5 shadow-[0_12px_30px_rgba(11,94,120,.08)]">
              <summary className="font-heading font-bold text-text cursor-pointer">{f.q}</summary>
              <p className="mt-2 text-text-muted">{f.a}</p>
            </details>
          ))}
        </section>

        {/* Methodology */}
        <section className="rounded-[28px] bg-stone px-7 py-6 text-sm text-text-muted">
          <h2 className="font-heading font-bold text-text mb-2">{t.methodology}</h2>
          <p>{t.methodologyText}</p>
          <p className="mt-2 text-xs text-text-light">
            {t.updated}: {dateLabel}, {timeLabel} (Europe/Athens)
          </p>
        </section>
      </div>
    </main>
  );
}
