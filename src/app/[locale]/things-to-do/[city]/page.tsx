import { CITIES, MONTH_NAMES } from "@/lib/weather-monthly";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/types";
import { Waves, Sun, UtensilsCrossed, Mountain, Calendar, ChevronLeft, MapPin, ChevronRight, Bus } from "lucide-react";
import { BusAccessBox } from "@/components/BusAccessBox";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildAlternates } from "@/lib/seo";
import { cityThingsToDoSchema } from "@/lib/schema";
import { CarPromo } from "@/components/car-rental/CarPromo";
import { getBusRoutes } from "@/lib/buses";
import { qualityPairSlugs, type SeoRoute } from "@/lib/bus-seo";
import { eligiblePairs } from "@/lib/bus-pairs";
import { JsonLd } from "@/components/JsonLd";

export const revalidate = 172800; // 03/07 optim couts Vercel (48h, ISR Writes)

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const CITY_INFO: Record<string, {
  descEn: string; descFr: string; descDe: string; descEl: string;
  bestMonths: string[]; highlights: string[];
  closestVillage: string;
}> = {
  heraklion: {
    descEn: "Crete's capital and largest city. Home to the Palace of Knossos, the Heraklion Archaeological Museum, and a vibrant waterfront. Gateway to central Crete's beaches and mountain villages.",
    descFr: "Capitale et plus grande ville de Crète. Abrite le palais de Knossos, le musée archéologique d'Héraklion et un front de mer animé.",
    descDe: "Kretas Hauptstadt und größte Stadt. Heimat des Palastes von Knossos, des Archäologischen Museums und einer lebhaften Uferpromenade.",
    descEl: "Πρωτεύουσα και μεγαλύτερη πόλη της Κρήτης. Φιλοξενεί το Παλάτι της Κνωσού και το Αρχαιολογικό Μουσείο Ηρακλείου.",
    bestMonths: ["may", "june", "september", "october"],
    highlights: ["Knossos Palace", "Archaeological Museum", "Koules Fortress", "Lion Square"],
    closestVillage: "heraklion",
  },
  chania: {
    descEn: "The jewel of western Crete. A stunning Venetian harbor, the famous Elafonisi and Balos beaches nearby, and the dramatic Samaria Gorge. Rich Ottoman and Venetian architecture.",
    descFr: "Le joyau de l'ouest crétois. Un port vénitien magnifique, les célèbres plages d'Elafonisi et Balos, et les gorges spectaculaires de Samaria.",
    descDe: "Das Juwel Westkretas. Ein atemberaubender venezianischer Hafen, die berühmten Strände Elafonisi und Balos, und die dramatische Samaria-Schlucht.",
    descEl: "Το στολίδι της δυτικής Κρήτης. Ένα εκπληκτικό βενετσιάνικο λιμάνι, οι διάσημες παραλίες Ελαφονήσι και Μπάλος.",
    bestMonths: ["may", "june", "september", "october"],
    highlights: ["Venetian Harbor", "Elafonisi Beach", "Samaria Gorge", "Old Town"],
    closestVillage: "chania",
  },
  rethymno: {
    descEn: "A charming university town with one of the best-preserved old towns in Crete. The Fortezza fortress, long sandy beach, and a blend of Venetian and Ottoman architecture.",
    descFr: "Une charmante ville universitaire avec l'une des vieilles villes les mieux préservées de Crète. La forteresse Fortezza et une longue plage de sable.",
    descDe: "Eine charmante Universitätsstadt mit einer der besterhaltenen Altstädte Kretas. Die Festung Fortezza und ein langer Sandstrand.",
    descEl: "Μια γοητευτική πανεπιστημιακή πόλη με μία από τις καλύτερα διατηρημένες παλιές πόλεις της Κρήτης.",
    bestMonths: ["may", "june", "september", "october"],
    highlights: ["Fortezza Fortress", "Old Town", "Rimondi Fountain", "Town Beach"],
    closestVillage: "rethymno",
  },
  "agios-nikolaos": {
    descEn: "A picturesque lakeside town in east Crete. Known for Lake Voulismeni, the nearby island of Spinalonga, and access to some of Crete's most beautiful eastern beaches.",
    descFr: "Une ville pittoresque au bord du lac dans l'est de la Crète. Connue pour le lac Voulismeni et l'île de Spinalonga.",
    descDe: "Eine malerische Stadt am See in Ostkreta. Bekannt für den Voulismeni-See und die nahe Insel Spinalonga.",
    descEl: "Μια γραφική πόλη στην ανατολική Κρήτη. Γνωστή για τη λίμνη Βουλισμένη και το νησί της Σπιναλόγκας.",
    bestMonths: ["may", "june", "september", "october"],
    highlights: ["Lake Voulismeni", "Spinalonga Island", "Elounda", "Almyros Beach"],
    closestVillage: "agios-nikolaos",
  },
  sitia: {
    descEn: "A relaxed, authentic town in far-east Crete. Home to the palm beach of Vai, the Toplou Monastery, and unspoiled villages. Less touristy, more authentic.",
    descFr: "Une ville détendue et authentique à l'extrême est de la Crète. Abrite la plage de palmiers de Vai et le monastère de Toplou.",
    descDe: "Eine entspannte, authentische Stadt im äußersten Osten Kretas. Heimat des Palmenstrandes von Vai und des Klosters Toplou.",
    descEl: "Μια χαλαρή, αυθεντική πόλη στην ανατολική Κρήτη. Φιλοξενεί την παραλία φοινικόδασος του Βάι.",
    bestMonths: ["may", "june", "september", "october"],
    highlights: ["Vai Palm Beach", "Toplou Monastery", "Kazarma Fortress", "Petras"],
    closestVillage: "sitia",
  },
  ierapetra: {
    descEn: "Europe's southernmost city. Year-round warm climate, the island of Chrysi with its cedar forest and turquoise waters, and vast greenhouse agriculture.",
    descFr: "La ville la plus au sud d'Europe. Climat chaud toute l'année, l'île de Chrysi avec sa forêt de cèdres et ses eaux turquoise.",
    descDe: "Europas südlichste Stadt. Ganzjährig warmes Klima, die Insel Chrysi mit Zedernwald und türkisem Wasser.",
    descEl: "Η νοτιότερη πόλη της Ευρώπης. Ζεστό κλίμα όλο τον χρόνο, το νησί Χρυσή με το κεδρόδασος.",
    bestMonths: ["april", "may", "june", "september", "october"],
    highlights: ["Chrysi Island", "Kales Fortress", "Bramiana Wetland", "Myrtos Beach"],
    closestVillage: "ierapetra",
  },
  malia: {
    descEn: "A lively resort town known for its long sandy beach and vibrant nightlife. Also home to the lesser-known Malia Palace, a Minoan archaeological site.",
    descFr: "Une station balnéaire animée connue pour sa longue plage de sable et sa vie nocturne. Abrite aussi le palais minoen de Malia.",
    descDe: "Ein lebhafter Ferienort bekannt für seinen langen Sandstrand und sein Nachtleben. Auch Heimat des minoischen Palastes von Malia.",
    descEl: "Ένα ζωντανό θέρετρο γνωστό για τη μεγάλη αμμώδη παραλία και τη νυχτερινή ζωή. Φιλοξενεί το μινωικό ανάκτορο Μαλίων.",
    bestMonths: ["june", "july", "august", "september"],
    highlights: ["Malia Beach", "Minoan Palace", "Stalis Beach", "Nightlife"],
    closestVillage: "malia",
  },
  hersonissos: {
    descEn: "One of Crete's most popular resort towns. Waterparks, beach bars, and easy access to the Lassithi Plateau and Dikteon Cave (birthplace of Zeus).",
    descFr: "L'une des stations balnéaires les plus populaires de Crète. Parcs aquatiques, bars de plage et accès facile au plateau du Lassithi.",
    descDe: "Einer der beliebtesten Ferienorte Kretas. Wasserparks, Strandbars und einfacher Zugang zur Lassithi-Hochebene.",
    descEl: "Ένα από τα πιο δημοφιλή θέρετρα της Κρήτης. Aquapark, beach bars και εύκολη πρόσβαση στο Οροπέδιο Λασιθίου.",
    bestMonths: ["june", "july", "august", "september"],
    highlights: ["Aquaworld", "Star Beach", "Lassithi Plateau", "Lychnostatis Museum"],
    closestVillage: "hersonissos",
  },
  elounda: {
    descEn: "An upscale resort area near Agios Nikolaos. Famous for luxury hotels, the sunken city of Olous, and boat trips to the historic Spinalonga fortress island.",
    descFr: "Une zone de villégiature haut de gamme près d'Agios Nikolaos. Célèbre pour ses hôtels de luxe et l'île-forteresse de Spinalonga.",
    descDe: "Ein gehobenes Urlaubsgebiet nahe Agios Nikolaos. Berühmt für Luxushotels und Bootsausflüge zur historischen Festungsinsel Spinalonga.",
    descEl: "Μια υψηλού επιπέδου περιοχή κοντά στον Άγιο Νικόλαο. Διάσημη για τα πολυτελή ξενοδοχεία και τη Σπιναλόγκα.",
    bestMonths: ["may", "june", "september", "october"],
    highlights: ["Spinalonga Island", "Olous Sunken City", "Plaka Village", "Kolokytha Beach"],
    closestVillage: "elounda",
  },
  makrigialos: {
    descEn: "A peaceful seaside village in southeast Crete. Long shallow sandy beach, authentic tavernas, and proximity to the Butterfly Gorge and Kapsa Monastery.",
    descFr: "Un paisible village balnéaire dans le sud-est de la Crète. Longue plage de sable peu profonde, tavernes authentiques et proximité des gorges des Papillons.",
    descDe: "Ein friedliches Küstendorf im Südosten Kretas. Langer flacher Sandstrand, authentische Tavernen und Nähe zur Schmetterlingsschlucht.",
    descEl: "Ένα ήρεμο παραθαλάσσιο χωριό στη νοτιοανατολική Κρήτη. Μεγάλη ρηχή αμμώδης παραλία και αυθεντικές ταβέρνες.",
    bestMonths: ["april", "may", "june", "september", "october"],
    highlights: ["Makrigialos Beach", "Butterfly Gorge", "Kapsa Monastery", "Diaskari Beach"],
    closestVillage: "makrigialos",
  },
};

// Maps things-to-do city slug -> bus place slug (for cities where they differ).
// For most cities the slugs are identical; only exceptions need an entry.
const CITY_TO_BUS_SLUG: Record<string, string> = {
  "makrigialos": "makry-gyalos",
};

function cityBusSlug(citySlug: string): string {
  return CITY_TO_BUS_SLUG[citySlug] ?? citySlug;
}

const LABELS: Record<string, {
  thingsToDo: string; bestBeaches: string; weather: string; whereToEat: string;
  hiking: string; events: string; backToAll: string; allCities: string;
  bestTimeToVisit: string; topHighlights: string; faq: string;
  exploreBeaches: string; checkWeather: string; discoverFood: string;
  exploreHikes: string; browseEvents: string; gettingThereBus: string;
}> = {
  en: {
    thingsToDo: "Things to do in",
    bestBeaches: "Best beaches near",
    weather: "Weather in",
    whereToEat: "Where to eat in",
    hiking: "Hiking near",
    events: "Events in",
    backToAll: "All cities",
    allCities: "Explore other cities",
    bestTimeToVisit: "Best time to visit",
    topHighlights: "Top highlights",
    faq: "Frequently asked questions",
    exploreBeaches: "Explore beaches",
    checkWeather: "Check weather",
    discoverFood: "Discover restaurants",
    exploreHikes: "Explore hikes",
    browseEvents: "Browse events",
    gettingThereBus: "Getting there by bus",
  },
  fr: {
    thingsToDo: "Que faire à",
    bestBeaches: "Les meilleures plages près de",
    weather: "Météo à",
    whereToEat: "Où manger à",
    hiking: "Randonnées près de",
    events: "Événements à",
    backToAll: "Toutes les villes",
    allCities: "Explorer d'autres villes",
    bestTimeToVisit: "Meilleure période pour visiter",
    topHighlights: "Incontournables",
    faq: "Questions fréquentes",
    exploreBeaches: "Explorer les plages",
    checkWeather: "Voir la météo",
    discoverFood: "Découvrir les restaurants",
    exploreHikes: "Explorer les randonnées",
    browseEvents: "Voir les événements",
    gettingThereBus: "Comment y aller en bus",
  },
  de: {
    thingsToDo: "Aktivitäten in",
    bestBeaches: "Die besten Strände bei",
    weather: "Wetter in",
    whereToEat: "Essen in",
    hiking: "Wandern bei",
    events: "Veranstaltungen in",
    backToAll: "Alle Städte",
    allCities: "Andere Städte erkunden",
    bestTimeToVisit: "Beste Reisezeit",
    topHighlights: "Top-Highlights",
    faq: "Häufig gestellte Fragen",
    exploreBeaches: "Strände erkunden",
    checkWeather: "Wetter prüfen",
    discoverFood: "Restaurants entdecken",
    exploreHikes: "Wanderungen erkunden",
    browseEvents: "Veranstaltungen ansehen",
    gettingThereBus: "Anreise mit dem Bus",
  },
  el: {
    thingsToDo: "Τι να κάνετε στ",
    bestBeaches: "Οι καλύτερες παραλίες κοντά στ",
    weather: "Καιρός στ",
    whereToEat: "Πού να φάτε στ",
    hiking: "Πεζοπορία κοντά στ",
    events: "Εκδηλώσεις στ",
    backToAll: "Όλες οι πόλεις",
    allCities: "Εξερευνήστε άλλες πόλεις",
    bestTimeToVisit: "Καλύτερη εποχή για επίσκεψη",
    topHighlights: "Κορυφαία αξιοθέατα",
    faq: "Συχνές ερωτήσεις",
    exploreBeaches: "Εξερευνήστε παραλίες",
    checkWeather: "Δείτε τον καιρό",
    discoverFood: "Ανακαλύψτε εστιατόρια",
    exploreHikes: "Εξερευνήστε μονοπάτια",
    browseEvents: "Δείτε εκδηλώσεις",
    gettingThereBus: "Μετάβαση με λεωφορείο",
  },
};

function getCityObj(slug: string) {
  return CITIES.find(c => c.slug === slug);
}

export function generateStaticParams() {
  return CITIES.map(city => ({ city: city.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; city: string }> }) {
  const { locale, city: citySlug } = await params;
  setRequestLocale(locale);
  const city = getCityObj(citySlug);
  const info = CITY_INFO[citySlug];
  if (!city || !info) return { title: "Not found" };

  // CTR-optimised : year 2026 freshness + concrete promise + local authority.
  // Previous generic "Things to Do in X" at pos 52 = page 5-6. Aim for page 2-3 with better hook.
  const titles: Record<string, string> = {
    en: `${city.name} Crete 2026: Top 10 Things to Do (Local's Honest Guide)`,
    fr: `Que faire à ${city.name} en Crète 2026 : Top 10 activités (Guide local)`,
    de: `${city.name} Kreta 2026: Top 10 Aktivitäten (Ehrlicher Insider-Guide)`,
    el: `${city.nameEl} Κρήτη 2026: Top 10 δραστηριότητες (Οδηγός ντόπιου)`,
  };

  const descs: Record<string, string> = {
    en: info.descEn,
    fr: info.descFr,
    de: info.descDe,
    el: info.descEl,
  };

  const url = `${BASE_URL}/${locale}/things-to-do/${citySlug}`;

  return {
    title: titles[locale] || titles.en,
    description: descs[locale] || descs.en,
    alternates: buildAlternates(locale, `/things-to-do/${citySlug}`),
    openGraph: { title: titles[locale] || titles.en, description: descs[locale] || descs.en, url },
  };
}

export default async function ThingsToDoPage({ params }: { params: Promise<{ locale: string; city: string }> }) {
  const { locale, city: citySlug } = await params;
  setRequestLocale(locale);
  const city = getCityObj(citySlug);
  const info = CITY_INFO[citySlug];

  if (!city || !info) notFound();

  const L = LABELS[locale] || LABELS.en;
  const desc = locale === "fr" ? info.descFr : locale === "de" ? info.descDe : locale === "el" ? info.descEl : info.descEn;

  // Bus pair links: find quality pairs that involve this city.
  const busRoutes = (await getBusRoutes()) as SeoRoute[];
  const busCitySlug = cityBusSlug(citySlug);
  const allPairs = eligiblePairs(busRoutes);
  const qualitySlugs = qualityPairSlugs(busRoutes);
  const busPairLinks = qualitySlugs
    .filter((s) => {
      const sepIdx = s.indexOf("-to-");
      if (sepIdx === -1) return false;
      const a = s.slice(0, sepIdx);
      const b = s.slice(sepIdx + 4);
      return a === busCitySlug || b === busCitySlug;
    })
    .slice(0, 5)
    .map((pairSlug) => {
      const pair = allPairs.find((p) => p.slug === pairSlug);
      return { slug: pairSlug, placeA: pair?.placeA ?? "", placeB: pair?.placeB ?? "" };
    });

  // Pick 4 season months for weather links
  const seasonMonths = ["march", "june", "september", "december"];

  // FAQ items
  const faqItems = [
    {
      q: locale === "fr" ? `Que faire à ${city.name} ?` : locale === "de" ? `Was kann man in ${city.name} machen?` : locale === "el" ? `Τι να κάνετε στην ${city.nameEl};` : `What to do in ${city.name}?`,
      a: locale === "fr"
        ? `${city.name} offre des plages magnifiques, des sites historiques comme ${info.highlights[0]}, une gastronomie crétoise authentique et des randonnées à couper le souffle.`
        : locale === "de"
        ? `${city.name} bietet wunderschöne Strände, historische Stätten wie ${info.highlights[0]}, authentische kretische Küche und atemberaubende Wanderungen.`
        : locale === "el"
        ? `Η ${city.nameEl} προσφέρει πανέμορφες παραλίες, ιστορικά αξιοθέατα όπως ${info.highlights[0]}, αυθεντική κρητική κουζίνα και εκπληκτικά μονοπάτια.`
        : `${city.name} offers beautiful beaches, historic sites like ${info.highlights[0]}, authentic Cretan cuisine, and breathtaking hiking trails.`,
    },
    {
      q: locale === "fr" ? `Quelle est la meilleure période pour visiter ${city.name} ?` : locale === "de" ? `Wann ist die beste Reisezeit für ${city.name}?` : locale === "el" ? `Ποια είναι η καλύτερη εποχή για επίσκεψη στην ${city.nameEl};` : `What is the best time to visit ${city.name}?`,
      a: locale === "fr"
        ? `Les meilleurs mois pour visiter ${city.name} sont ${info.bestMonths.map(m => MONTH_NAMES.fr[m]).join(", ")}. Le temps est agréable, les plages accessibles et les foules moindres qu'en plein été.`
        : locale === "de"
        ? `Die besten Monate für einen Besuch in ${city.name} sind ${info.bestMonths.map(m => MONTH_NAMES.de[m]).join(", ")}. Das Wetter ist angenehm und es ist weniger überlaufen als im Hochsommer.`
        : locale === "el"
        ? `Οι καλύτεροι μήνες για επίσκεψη στην ${city.nameEl} είναι ${info.bestMonths.map(m => MONTH_NAMES.el[m]).join(", ")}. Ο καιρός είναι ευχάριστος και ο κόσμος λιγότερος.`
        : `The best months to visit ${city.name} are ${info.bestMonths.map(m => MONTH_NAMES.en[m]).join(", ")}. The weather is pleasant, beaches are accessible, and crowds are smaller than peak summer.`,
    },
    {
      q: locale === "fr" ? `${city.name} vaut-elle le détour ?` : locale === "de" ? `Lohnt sich ein Besuch in ${city.name}?` : locale === "el" ? `Αξίζει να επισκεφτείτε την ${city.nameEl};` : `Is ${city.name} worth visiting?`,
      a: locale === "fr"
        ? `Absolument. ${city.name} combine ${info.highlights.slice(0, 3).join(", ")} et une atmosphère crétoise authentique. C'est l'une des destinations incontournables de Crète.`
        : locale === "de"
        ? `Auf jeden Fall. ${city.name} vereint ${info.highlights.slice(0, 3).join(", ")} und eine authentische kretische Atmosphäre. Es ist eines der Muss-Reiseziele auf Kreta.`
        : locale === "el"
        ? `Σίγουρα. Η ${city.nameEl} συνδυάζει ${info.highlights.slice(0, 3).join(", ")} με αυθεντική κρητική ατμόσφαιρα. Είναι ένας από τους κορυφαίους προορισμούς στην Κρήτη.`
        : `Absolutely. ${city.name} combines ${info.highlights.slice(0, 3).join(", ")} with an authentic Cretan atmosphere. It is one of Crete's must-visit destinations.`,
    },
  ];

  const homeLabels: Record<string, string> = {
    en: "Home", fr: "Accueil", de: "Startseite", el: "Αρχική",
    it: "Home", nl: "Home", pl: "Strona główna", es: "Inicio", pt: "Início",
    ru: "Главная", ja: "ホーム", ko: "홈", zh: "首页", tr: "Ana sayfa",
    sv: "Hem", da: "Hjem", no: "Hjem", fi: "Etusivu", cs: "Domů",
    hu: "Főoldal", ro: "Acasă", ar: "الرئيسية",
  };

  const thingsToDoLabels: Record<string, string> = {
    en: "Things to do", fr: "Que faire", de: "Aktivitäten", el: "Δραστηριότητες",
    it: "Cosa fare", nl: "Bezienswaardigheden", pl: "Atrakcje", es: "Qué hacer", pt: "O que fazer",
    ru: "Что делать", ja: "観光", ko: "할 일", zh: "活动", tr: "Yapılacaklar",
    sv: "Att göra", da: "Ting at gøre", no: "Ting å gjøre", fi: "Tekemistä", cs: "Co dělat",
    hu: "Tennivalók", ro: "De făcut", ar: "أنشطة",
  };

  const pageTitles: Record<string, string> = {
    en: `Things to Do in ${city.name}, Crete - Activities & Attractions`,
    fr: `Que faire à ${city.name}, Crète - Activités & Sites à visiter`,
    de: `Aktivitäten in ${city.name}, Kreta - Sehenswürdigkeiten & Tipps`,
    el: `Τι να κάνετε στην ${city.nameEl}, Κρήτη - Δραστηριότητες & Αξιοθέατα`,
  };

  const pageSchema = cityThingsToDoSchema({
    locale,
    city: {
      slug: citySlug,
      name: city.name,
      nameEl: city.nameEl,
      lat: city.lat,
      lng: city.lng,
    },
    pageTitle: pageTitles[locale] || pageTitles.en,
    description: desc,
    highlights: info.highlights,
    faqItems,
    breadcrumbLabels: {
      home: homeLabels[locale] || homeLabels.en,
      thingsToDo: thingsToDoLabels[locale] || thingsToDoLabels.en,
    },
  });

  const sections = [
    {
      icon: <Waves className="w-6 h-6 text-sea" />,
      title: `${L.bestBeaches} ${city.name}`,
      description: locale === "fr"
        ? `Découvrez les plus belles plages à proximité de ${city.name}.`
        : locale === "de"
        ? `Entdecken Sie die schönsten Strände in der Nähe von ${city.name}.`
        : locale === "el"
        ? `Ανακαλύψτε τις ωραιότερες παραλίες κοντά στην ${city.nameEl}.`
        : `Discover the most beautiful beaches near ${city.name}.`,
      link: `/${locale}/beaches/near/${info.closestVillage}`,
      cta: L.exploreBeaches,
    },
    {
      icon: <Sun className="w-6 h-6 text-amber-500" />,
      title: `${L.weather} ${city.name}`,
      description: locale === "fr"
        ? `Consultez la météo mois par mois pour planifier votre séjour.`
        : locale === "de"
        ? `Prüfen Sie das Wetter Monat für Monat für Ihre Reiseplanung.`
        : locale === "el"
        ? `Δείτε τον καιρό μήνα-μήνα για να σχεδιάσετε το ταξίδι σας.`
        : `Check the monthly weather forecast to plan your trip.`,
      link: null, // will render season grid instead
      cta: L.checkWeather,
    },
    {
      icon: <UtensilsCrossed className="w-6 h-6 text-terracotta" />,
      title: `${L.whereToEat} ${city.name}`,
      description: locale === "fr"
        ? `Tavernes traditionnelles, restaurants et cafés : découvrez la gastronomie crétoise.`
        : locale === "de"
        ? `Traditionelle Tavernen, Restaurants und Cafés: Entdecken Sie die kretische Küche.`
        : locale === "el"
        ? `Παραδοσιακές ταβέρνες, εστιατόρια και καφέ: ανακαλύψτε την κρητική κουζίνα.`
        : `Traditional tavernas, restaurants, and cafes: discover Cretan cuisine.`,
      link: `/${locale}/food`,
      cta: L.discoverFood,
    },
    {
      icon: <Mountain className="w-6 h-6 text-olive" />,
      title: `${L.hiking} ${city.name}`,
      description: locale === "fr"
        ? `Gorges, sentiers côtiers et chemins de montagne pour tous les niveaux.`
        : locale === "de"
        ? `Schluchten, Küstenwege und Bergpfade für alle Niveaus.`
        : locale === "el"
        ? `Φαράγγια, παραθαλάσσια μονοπάτια και ορεινές διαδρομές για όλα τα επίπεδα.`
        : `Gorges, coastal trails, and mountain paths for all levels.`,
      link: `/${locale}/hikes`,
      cta: L.exploreHikes,
    },
    {
      icon: <Calendar className="w-6 h-6 text-sea" />,
      title: `${L.events} ${city.name}`,
      description: locale === "fr"
        ? `Festivals, fêtes locales et événements culturels tout au long de l'année.`
        : locale === "de"
        ? `Festivals, lokale Feste und kulturelle Veranstaltungen das ganze Jahr über.`
        : locale === "el"
        ? `Φεστιβάλ, τοπικές γιορτές και πολιτιστικές εκδηλώσεις όλο τον χρόνο.`
        : `Festivals, local celebrations, and cultural events throughout the year.`,
      link: `/${locale}/events`,
      cta: L.browseEvents,
    },
  ];

  return (
    <main className="min-h-screen bg-surface">
      <JsonLd data={pageSchema} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-sea text-white py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href={`/${locale}/weather`} className="inline-flex items-center gap-1 text-white/50 text-sm hover:text-white/80 mb-4">
            <ChevronLeft className="w-4 h-4" /> {L.backToAll}
          </Link>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight" style={{ fontFamily: "var(--font-heading, 'Comfortaa', system-ui, sans-serif)" }}>
            {L.thingsToDo} {city.name}
          </h1>
          <p className="text-white/50 text-sm mt-2">{city.nameEl}</p>
          <p className="text-white/80 text-lg mt-4 max-w-2xl leading-relaxed">{desc}</p>
        </div>
        <svg className="absolute bottom-0 left-0 w-full h-[56px]" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden>
          <path d="M0 40 C180 0 320 70 540 42 C760 14 900 66 1130 40 C1290 22 1380 36 1440 28 L1440 70 L0 70 Z" fill="#F6FBFC" />
        </svg>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* Top highlights */}
        <section>
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">{L.topHighlights}</h2>
          <div className="flex flex-wrap gap-2">
            {info.highlights.map(h => (
              <span key={h} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border rounded-full text-sm font-medium text-text">
                <MapPin className="w-3.5 h-3.5 text-terracotta" /> {h}
              </span>
            ))}
          </div>
        </section>

        {/* Best time to visit */}
        <section>
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">{L.bestTimeToVisit}</h2>
          <div className="flex flex-wrap gap-2">
            {info.bestMonths.map(m => (
              <Link
                key={m}
                href={`/${locale}/weather/${citySlug}/${m}`}
                className="px-3 py-1.5 bg-olive/10 text-olive rounded-lg text-sm font-semibold hover:bg-olive/20 transition-colors"
              >
                {(MONTH_NAMES[locale]?.[m] || MONTH_NAMES.en[m])}
              </Link>
            ))}
          </div>
        </section>

        {/* Activity sections */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <section key={i} className="rounded-xl bg-white border border-border p-6 hover:border-sea/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
                  {section.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-text mb-1">{section.title}</h2>
                  <p className="text-sm text-text-muted leading-relaxed mb-3">{section.description}</p>

                  {/* Weather section gets a season grid */}
                  {section.link === null ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                      {seasonMonths.map(m => (
                        <Link
                          key={m}
                          href={`/${locale}/weather/${citySlug}/${m}`}
                          className="flex items-center justify-between p-2.5 bg-surface rounded-lg text-xs font-semibold text-text hover:bg-sea-faint hover:text-sea transition-colors"
                        >
                          <span>{(MONTH_NAMES[locale]?.[m] || MONTH_NAMES.en[m])}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Link
                      href={section.link}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-sea hover:text-sea/80 transition-colors"
                    >
                      {section.cta} <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Car Rental Direct. Les slugs ACTIVITY_CITIES sont aussi des pickups
            CAR_ZONES : le CTA route vers la landing /car-rental/<ville>. */}
        <CarPromo locale={locale} pickup={city.slug} source="things-to-do" />

        {/* FAQ */}
        <section>
          <h2 className="text-xl font-bold text-sea mb-4">{L.faq}</h2>
          <div className="space-y-4">
            {faqItems.map((faq, i) => (
              <div key={i} className="p-5 bg-white rounded-xl border border-border">
                <h3 className="font-semibold text-text mb-2">{faq.q}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bus access · internal linking vers /buses */}
        <BusAccessBox
          locale={locale}
          destinationName={city.name}
          matchSlug={citySlug}
          matchOn="things_to_do_slug"
        />

        {/* Bus pair links · internal authority flow to quality bus pair pages */}
        {busPairLinks.length > 0 && (
          <section className="rounded-xl bg-white border border-border p-6 hover:border-sea/30 transition-colors">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
                <Bus className="w-6 h-6 text-sea" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-text mb-3">{L.gettingThereBus}</h2>
                <ul className="space-y-2">
                  {busPairLinks.map(({ slug: pSlug, placeA, placeB }) => {
                    const connector =
                      locale === "fr" ? "bus pour" :
                      locale === "de" ? "Bus nach" :
                      locale === "el" ? "λεωφορείο προς" :
                      "bus to";
                    return (
                      <li key={pSlug}>
                        <Link
                          href={`/${locale}/buses/${pSlug}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-sea hover:text-sea/80 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 flex-shrink-0" />
                          {placeA} {connector} {placeB}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Other cities */}
        <section>
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3 mt-10">{L.allCities}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {CITIES.filter(c => c.slug !== citySlug).map(c => (
              <Link
                key={c.slug}
                href={`/${locale}/things-to-do/${c.slug}`}
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-border hover:border-sea/30 transition-colors"
              >
                <span className="text-sm font-medium text-text">{c.name}</span>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
