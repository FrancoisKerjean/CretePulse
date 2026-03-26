import { breadcrumbSchema } from "@/lib/schema";
import type { Locale } from "@/lib/types";
import { MapPin, Clock, Ticket, ChevronLeft, ChevronRight, Landmark } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

interface LocalizedText {
  en: string;
  fr: string;
  de: string;
  el: string;
}

interface Site {
  slug: string;
  name: string;
  nameEl: string;
  period: string;
  city: string;
  price: string;
  hours: string;
  desc: LocalizedText;
  highlights: string[];
}

const SITES: Site[] = [
  { slug: "knossos", name: "Knossos", nameEl: "\u039a\u03bd\u03c9\u03c3\u03cc\u03c2", period: "Minoan (2000-1400 BC)", city: "Heraklion", price: "\u20ac15", hours: "8:00-19:00 (summer)", desc: { en: "The largest Minoan palace and Europe's oldest city. Home of the legendary Minotaur's labyrinth. Partially reconstructed by Arthur Evans.", fr: "Le plus grand palais minoen et la plus ancienne ville d'Europe. Lieu du l\u00e9gendaire labyrinthe du Minotaure.", de: "Der gr\u00f6\u00dfte minoische Palast und Europas \u00e4lteste Stadt. Heimat des legend\u00e4ren Minotaurus-Labyrinths.", el: "\u03a4\u03bf \u03bc\u03b5\u03b3\u03b1\u03bb\u03cd\u03c4\u03b5\u03c1\u03bf \u03bc\u03b9\u03bd\u03c9\u03b9\u03ba\u03cc \u03b1\u03bd\u03ac\u03ba\u03c4\u03bf\u03c1\u03bf \u03ba\u03b1\u03b9 \u03b7 \u03b1\u03c1\u03c7\u03b1\u03b9\u03cc\u03c4\u03b5\u03c1\u03b7 \u03c0\u03cc\u03bb\u03b7 \u03c4\u03b7\u03c2 \u0395\u03c5\u03c1\u03ce\u03c0\u03b7\u03c2." }, highlights: ["Throne Room", "Queen's Megaron", "Bull-Leaping Fresco", "Grand Staircase"] },
  { slug: "phaistos", name: "Phaistos", nameEl: "\u03a6\u03b1\u03b9\u03c3\u03c4\u03cc\u03c2", period: "Minoan (2000-1400 BC)", city: "Messara", price: "\u20ac8", hours: "8:00-19:00 (summer)", desc: { en: "The second-largest Minoan palace, set on a hilltop with panoramic views over the Messara Plain. Less reconstructed than Knossos, more atmospheric.", fr: "Le deuxi\u00e8me plus grand palais minoen, sur une colline avec vue panoramique sur la plaine de Messara.", de: "Der zweitgr\u00f6\u00dfte minoische Palast auf einem H\u00fcgel mit Panoramablick \u00fcber die Messara-Ebene.", el: "\u03a4\u03bf \u03b4\u03b5\u03cd\u03c4\u03b5\u03c1\u03bf \u03bc\u03b5\u03b3\u03b1\u03bb\u03cd\u03c4\u03b5\u03c1\u03bf \u03bc\u03b9\u03bd\u03c9\u03b9\u03ba\u03cc \u03b1\u03bd\u03ac\u03ba\u03c4\u03bf\u03c1\u03bf, \u03c3\u03b5 \u03bb\u03cc\u03c6\u03bf \u03bc\u03b5 \u03c0\u03b1\u03bd\u03bf\u03c1\u03b1\u03bc\u03b9\u03ba\u03ae \u03b8\u03ad\u03b1." }, highlights: ["Central Court", "Grand Staircase", "Phaistos Disc discovery site", "Messara Plain views"] },
  { slug: "spinalonga", name: "Spinalonga", nameEl: "\u03a3\u03c0\u03b9\u03bd\u03b1\u03bb\u03cc\u03b3\u03ba\u03b1", period: "Venetian (1579) / Leper colony (1903-1957)", city: "Elounda", price: "\u20ac8", hours: "8:30-18:30", desc: { en: "A fortified island with a dramatic history - Venetian fortress, Ottoman village, and Greece's last leper colony. Made famous by Victoria Hislop's novel 'The Island'.", fr: "Une \u00eele fortifi\u00e9e \u00e0 l'histoire dramatique - forteresse v\u00e9nitienne, village ottoman et derni\u00e8re l\u00e9proserie de Gr\u00e8ce.", de: "Eine befestigte Insel mit dramatischer Geschichte - venezianische Festung, osmanisches Dorf und Griechenlands letzte Leprakolonie.", el: "\u0388\u03bd\u03b1 \u03bf\u03c7\u03c5\u03c1\u03c9\u03bc\u03ad\u03bd\u03bf \u03bd\u03b7\u03c3\u03af \u03bc\u03b5 \u03b4\u03c1\u03b1\u03bc\u03b1\u03c4\u03b9\u03ba\u03ae \u03b9\u03c3\u03c4\u03bf\u03c1\u03af\u03b1 - \u03b2\u03b5\u03bd\u03b5\u03c4\u03c3\u03b9\u03ac\u03bd\u03b9\u03ba\u03bf \u03c6\u03c1\u03bf\u03cd\u03c1\u03b9\u03bf, \u03bf\u03b8\u03c9\u03bc\u03b1\u03bd\u03b9\u03ba\u03cc \u03c7\u03c9\u03c1\u03b9\u03cc, \u03c4\u03b5\u03bb\u03b5\u03c5\u03c4\u03b1\u03af\u03bf \u03bb\u03b5\u03c0\u03c1\u03bf\u03ba\u03bf\u03bc\u03b5\u03af\u03bf." }, highlights: ["Venetian Fortress", "Leper Colony ruins", "Dante's Gate", "Sea views"] },
  { slug: "gortyna", name: "Gortyna", nameEl: "\u0393\u03cc\u03c1\u03c4\u03c5\u03bd\u03b1", period: "Roman (1st century BC - 9th century AD)", city: "Messara", price: "\u20ac6", hours: "8:00-19:00", desc: { en: "The capital of Roman Crete. Home to the Gortyn Code - the oldest and most complete Greek legal code ever found, carved into stone.", fr: "La capitale de la Cr\u00e8te romaine. Abrite le Code de Gortyne - le plus ancien code juridique grec complet.", de: "Die Hauptstadt des r\u00f6mischen Kreta. Heimat des Gortyn-Codes - dem \u00e4ltesten griechischen Gesetzestext.", el: "\u0397 \u03c0\u03c1\u03c9\u03c4\u03b5\u03cd\u03bf\u03c5\u03c3\u03b1 \u03c4\u03b7\u03c2 \u03c1\u03c9\u03bc\u03b1\u03ca\u03ba\u03ae\u03c2 \u039a\u03c1\u03ae\u03c4\u03b7\u03c2. \u039f \u039a\u03ce\u03b4\u03b9\u03ba\u03b1\u03c2 \u03c4\u03b7\u03c2 \u0393\u03cc\u03c1\u03c4\u03c5\u03bd\u03b1\u03c2 - \u03bf \u03b1\u03c1\u03c7\u03b1\u03b9\u03cc\u03c4\u03b5\u03c1\u03bf\u03c2 \u03b5\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03cc\u03c2 \u03bd\u03bf\u03bc\u03b9\u03ba\u03cc\u03c2 \u03ba\u03ce\u03b4\u03b9\u03ba\u03b1\u03c2." }, highlights: ["Gortyn Code", "Basilica of Agios Titos", "Roman Odeon", "Praetorium"] },
  { slug: "malia-palace", name: "Malia Palace", nameEl: "\u0391\u03bd\u03ac\u03ba\u03c4\u03bf\u03c1\u03bf \u039c\u03b1\u03bb\u03af\u03c9\u03bd", period: "Minoan (1900-1450 BC)", city: "Malia", price: "\u20ac6", hours: "8:00-19:00", desc: { en: "Third-largest Minoan palace. Less visited, more peaceful. The famous golden bee pendant was found here.", fr: "Troisi\u00e8me plus grand palais minoen. Moins visit\u00e9, plus paisible. Le c\u00e9l\u00e8bre pendentif abeille en or y a \u00e9t\u00e9 trouv\u00e9.", de: "Drittgr\u00f6\u00dfter minoischer Palast. Weniger besucht, friedlicher. Das ber\u00fchmte goldene Bienenh\u00e4nger wurde hier gefunden.", el: "\u03a4\u03c1\u03af\u03c4\u03bf \u03bc\u03b5\u03b3\u03b1\u03bb\u03cd\u03c4\u03b5\u03c1\u03bf \u03bc\u03b9\u03bd\u03c9\u03b9\u03ba\u03cc \u03b1\u03bd\u03ac\u03ba\u03c4\u03bf\u03c1\u03bf. \u039b\u03b9\u03b3\u03cc\u03c4\u03b5\u03c1\u03bf \u03b5\u03c0\u03b9\u03c3\u03ba\u03ad\u03c8\u03b9\u03bc\u03bf, \u03c0\u03b9\u03bf \u03ae\u03c1\u03b5\u03bc\u03bf." }, highlights: ["Central Court", "Kernos Stone", "Royal Quarters", "Chrysolakkos necropolis"] },
  { slug: "aptera", name: "Aptera", nameEl: "\u0386\u03c0\u03c4\u03b5\u03c1\u03b1", period: "Minoan to Ottoman", city: "Chania", price: "Free", hours: "8:00-15:00", desc: { en: "A city that spans thousands of years - Minoan origins, powerful Greek city-state, Roman cisterns, Byzantine monastery, Ottoman fortress, and WWII bunkers.", fr: "Une ville qui traverse les mill\u00e9naires - origines minoennes, cit\u00e9-\u00c9tat grecque, citernes romaines, monast\u00e8re byzantin.", de: "Eine Stadt \u00fcber Jahrtausende - minoische Urspr\u00fcnge, griechischer Stadtstaat, r\u00f6mische Zisternen, byzantinisches Kloster.", el: "\u039c\u03b9\u03b1 \u03c0\u03cc\u03bb\u03b7 \u03c7\u03b9\u03bb\u03b9\u03b5\u03c4\u03b9\u03ce\u03bd - \u03bc\u03b9\u03bd\u03c9\u03b9\u03ba\u03ad\u03c2 \u03ba\u03b1\u03c4\u03b1\u03b2\u03bf\u03bb\u03ad\u03c2, \u03b5\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ae \u03c0\u03cc\u03bb\u03b7-\u03ba\u03c1\u03ac\u03c4\u03bf\u03c2, \u03c1\u03c9\u03bc\u03b1\u03ca\u03ba\u03ad\u03c2 \u03b4\u03b5\u03be\u03b1\u03bc\u03b5\u03bd\u03ad\u03c2." }, highlights: ["Roman Cisterns", "Byzantine Monastery", "Turkish Fortress", "Souda Bay panorama"] },
];

const LABELS: Record<Locale, {
  archaeology: string;
  allSites: string;
  period: string;
  location: string;
  admission: string;
  openingHours: string;
  highlights: string;
  faqTitle: string;
  nearbySites: string;
  exploreMore: string;
  beaches: string;
  itineraries: string;
  villages: string;
  worthVisiting: string;
  howLong: string;
  howMuch: string;
  free: string;
}> = {
  en: {
    archaeology: "Archaeological sites",
    allSites: "All archaeological sites",
    period: "Period",
    location: "Location",
    admission: "Admission",
    openingHours: "Opening hours",
    highlights: "Highlights",
    faqTitle: "FAQ",
    nearbySites: "Other archaeological sites",
    exploreMore: "Explore more",
    beaches: "Best beaches",
    itineraries: "Itineraries",
    villages: "Traditional villages",
    worthVisiting: "Is %s worth visiting?",
    howLong: "How long should I spend at %s?",
    howMuch: "How much does %s cost?",
    free: "Free",
  },
  fr: {
    archaeology: "Sites arch\u00e9ologiques",
    allSites: "Tous les sites arch\u00e9ologiques",
    period: "\u00c9poque",
    location: "Localisation",
    admission: "Entr\u00e9e",
    openingHours: "Horaires",
    highlights: "Points forts",
    faqTitle: "FAQ",
    nearbySites: "Autres sites arch\u00e9ologiques",
    exploreMore: "Explorer",
    beaches: "Plus belles plages",
    itineraries: "Itin\u00e9raires",
    villages: "Villages traditionnels",
    worthVisiting: "%s vaut-il la visite ?",
    howLong: "Combien de temps pr\u00e9voir \u00e0 %s ?",
    howMuch: "Combien co\u00fbte l'entr\u00e9e \u00e0 %s ?",
    free: "Gratuit",
  },
  de: {
    archaeology: "Arch\u00e4ologische St\u00e4tten",
    allSites: "Alle arch\u00e4ologischen St\u00e4tten",
    period: "Epoche",
    location: "Standort",
    admission: "Eintritt",
    openingHours: "\u00d6ffnungszeiten",
    highlights: "Highlights",
    faqTitle: "FAQ",
    nearbySites: "Andere arch\u00e4ologische St\u00e4tten",
    exploreMore: "Mehr entdecken",
    beaches: "Sch\u00f6nste Str\u00e4nde",
    itineraries: "Reiserouten",
    villages: "Traditionelle D\u00f6rfer",
    worthVisiting: "Lohnt sich %s?",
    howLong: "Wie viel Zeit sollte man f\u00fcr %s einplanen?",
    howMuch: "Was kostet der Eintritt in %s?",
    free: "Kostenlos",
  },
  el: {
    archaeology: "\u0391\u03c1\u03c7\u03b1\u03b9\u03bf\u03bb\u03bf\u03b3\u03b9\u03ba\u03bf\u03af \u03c7\u03ce\u03c1\u03bf\u03b9",
    allSites: "\u038c\u03bb\u03bf\u03b9 \u03bf\u03b9 \u03b1\u03c1\u03c7\u03b1\u03b9\u03bf\u03bb\u03bf\u03b3\u03b9\u03ba\u03bf\u03af \u03c7\u03ce\u03c1\u03bf\u03b9",
    period: "\u03a0\u03b5\u03c1\u03af\u03bf\u03b4\u03bf\u03c2",
    location: "\u03a4\u03bf\u03c0\u03bf\u03b8\u03b5\u03c3\u03af\u03b1",
    admission: "\u0395\u03af\u03c3\u03bf\u03b4\u03bf\u03c2",
    openingHours: "\u038f\u03c1\u03b5\u03c2 \u03bb\u03b5\u03b9\u03c4\u03bf\u03c5\u03c1\u03b3\u03af\u03b1\u03c2",
    highlights: "\u0391\u03be\u03b9\u03bf\u03b8\u03ad\u03b1\u03c4\u03b1",
    faqTitle: "FAQ",
    nearbySites: "\u0386\u03bb\u03bb\u03bf\u03b9 \u03b1\u03c1\u03c7\u03b1\u03b9\u03bf\u03bb\u03bf\u03b3\u03b9\u03ba\u03bf\u03af \u03c7\u03ce\u03c1\u03bf\u03b9",
    exploreMore: "\u0395\u03be\u03b5\u03c1\u03b5\u03c5\u03bd\u03ae\u03c3\u03c4\u03b5",
    beaches: "\u039a\u03b1\u03bb\u03cd\u03c4\u03b5\u03c1\u03b5\u03c2 \u03c0\u03b1\u03c1\u03b1\u03bb\u03af\u03b5\u03c2",
    itineraries: "\u0394\u03c1\u03bf\u03bc\u03bf\u03bb\u03cc\u03b3\u03b9\u03b1",
    villages: "\u03a0\u03b1\u03c1\u03b1\u03b4\u03bf\u03c3\u03b9\u03b1\u03ba\u03ac \u03c7\u03c9\u03c1\u03b9\u03ac",
    worthVisiting: "\u0391\u03be\u03af\u03b6\u03b5\u03b9 \u03bd\u03b1 \u03b5\u03c0\u03b9\u03c3\u03ba\u03b5\u03c6\u03b8\u03b5\u03af\u03c4\u03b5 %s;",
    howLong: "\u03a0\u03cc\u03c3\u03bf \u03c7\u03c1\u03cc\u03bd\u03bf \u03c7\u03c1\u03b5\u03b9\u03ac\u03b6\u03b5\u03c3\u03c4\u03b5 \u03c3\u03c4\u03bf %s;",
    howMuch: "\u03a0\u03cc\u03c3\u03bf \u03ba\u03bf\u03c3\u03c4\u03af\u03b6\u03b5\u03b9 \u03c4\u03bf %s;",
    free: "\u0394\u03c9\u03c1\u03b5\u03ac\u03bd",
  },
};

function fmt(template: string, value: string): string {
  return template.replace("%s", value);
}

function getLocalized(obj: LocalizedText, locale: Locale): string {
  return obj[locale] || obj.en;
}

export function generateStaticParams() {
  return SITES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const loc = (locale || "en") as Locale;
  const site = SITES.find((s) => s.slug === slug);
  if (!site) return { title: "Site not found" };

  const desc = getLocalized(site.desc, loc);
  const title = `${site.name} (${site.nameEl}) - ${site.period} | Crete Direct`;
  const description = desc.substring(0, 160);
  const url = `${BASE_URL}/${locale}/archaeology/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
    },
  };
}

export default async function ArchaeologyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const loc = (locale || "en") as Locale;
  const L = LABELS[loc];

  const site = SITES.find((s) => s.slug === slug);
  if (!site) notFound();

  const desc = getLocalized(site.desc, loc);
  const url = `${BASE_URL}/${locale}/archaeology/${slug}`;
  const displayPrice = site.price === "Free" ? L.free : site.price;

  const breadcrumb = breadcrumbSchema([
    { name: "Crete Direct", url: `${BASE_URL}/${locale}` },
    { name: L.archaeology, url: `${BASE_URL}/${locale}/archaeology` },
    { name: site.name, url },
  ]);

  // TouristAttraction schema
  const attractionSchema = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: `${site.name} (${site.nameEl})`,
    description: getLocalized(site.desc, "en"),
    url,
    address: {
      "@type": "PostalAddress",
      addressLocality: site.city,
      addressRegion: "Crete",
      addressCountry: "GR",
    },
    openingHours: site.hours,
    isAccessibleForFree: site.price === "Free",
    touristType: "Archaeological site",
  };

  // FAQ
  const faqItems = [
    {
      q: fmt(L.worthVisiting, site.name),
      a: loc === "fr"
        ? `Oui, ${site.name} est l'un des sites arch\u00e9ologiques les plus importants de Cr\u00e8te. ${desc}`
        : loc === "de"
        ? `Ja, ${site.name} ist eine der wichtigsten arch\u00e4ologischen St\u00e4tten Kretas. ${desc}`
        : loc === "el"
        ? `\u039d\u03b1\u03b9, \u03c4\u03bf ${site.name} \u03b5\u03af\u03bd\u03b1\u03b9 \u03ad\u03bd\u03b1\u03c2 \u03b1\u03c0\u03cc \u03c4\u03bf\u03c5\u03c2 \u03c3\u03b7\u03bc\u03b1\u03bd\u03c4\u03b9\u03ba\u03cc\u03c4\u03b5\u03c1\u03bf\u03c5\u03c2 \u03b1\u03c1\u03c7\u03b1\u03b9\u03bf\u03bb\u03bf\u03b3\u03b9\u03ba\u03bf\u03cd\u03c2 \u03c7\u03ce\u03c1\u03bf\u03c5\u03c2 \u03c4\u03b7\u03c2 \u039a\u03c1\u03ae\u03c4\u03b7\u03c2. ${desc}`
        : `Yes, ${site.name} is one of Crete's most important archaeological sites. ${desc}`,
    },
    {
      q: fmt(L.howLong, site.name),
      a: loc === "fr"
        ? `Pr\u00e9voyez 1h30 \u00e0 2h pour une visite compl\u00e8te de ${site.name}. Un guide est recommand\u00e9 pour mieux comprendre l'histoire.`
        : loc === "de"
        ? `Planen Sie 1,5-2 Stunden f\u00fcr einen vollst\u00e4ndigen Besuch von ${site.name} ein. Ein F\u00fchrer wird empfohlen.`
        : loc === "el"
        ? `\u03a5\u03c0\u03bf\u03bb\u03bf\u03b3\u03af\u03c3\u03c4\u03b5 1,5-2 \u03ce\u03c1\u03b5\u03c2 \u03b3\u03b9\u03b1 \u03c0\u03bb\u03ae\u03c1\u03b7 \u03b5\u03c0\u03af\u03c3\u03ba\u03b5\u03c8\u03b7 \u03c3\u03c4\u03bf ${site.name}. \u03a3\u03c5\u03bd\u03b9\u03c3\u03c4\u03ac\u03c4\u03b1\u03b9 \u03be\u03b5\u03bd\u03b1\u03b3\u03cc\u03c2.`
        : `Allow 1.5-2 hours for a complete visit of ${site.name}. A guided tour is recommended for deeper understanding.`,
    },
    {
      q: fmt(L.howMuch, site.name),
      a: loc === "fr"
        ? `L'entr\u00e9e \u00e0 ${site.name} co\u00fbte ${displayPrice}. Horaires : ${site.hours}.`
        : loc === "de"
        ? `Der Eintritt zu ${site.name} kostet ${displayPrice}. \u00d6ffnungszeiten: ${site.hours}.`
        : loc === "el"
        ? `\u0397 \u03b5\u03af\u03c3\u03bf\u03b4\u03bf\u03c2 \u03c3\u03c4\u03bf ${site.name} \u03ba\u03bf\u03c3\u03c4\u03af\u03b6\u03b5\u03b9 ${displayPrice}. \u038f\u03c1\u03b5\u03c2: ${site.hours}.`
        : `Admission to ${site.name} is ${displayPrice}. Hours: ${site.hours}.`,
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const otherSites = SITES.filter((s) => s.slug !== slug);

  return (
    <main className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(attractionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <div className="relative bg-aegean py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-aegean via-aegean/90 to-aegean-dark" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-white/90 text-sm mb-6">
            <Landmark className="w-4 h-4" />
            {site.period}
          </span>
          <h1
            className="text-3xl md:text-5xl font-bold text-white mb-2"
            style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
          >
            {site.name}
          </h1>
          <p className="text-white/70 text-lg">{site.nameEl}</p>
          <div className="flex items-center justify-center gap-2 text-white/75 text-sm mt-3">
            <MapPin className="w-4 h-4" />
            {site.city}, Crete
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href={`/${locale}/archaeology`}
          className="inline-flex items-center gap-1 text-sm text-aegean hover:underline mb-8"
        >
          <ChevronLeft className="w-4 h-4" /> {L.allSites}
        </Link>

        {/* Practical info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Landmark className="w-5 h-5 text-aegean mx-auto" />
            <p className="text-xs text-text-muted mt-1">{L.period}</p>
            <p className="font-semibold text-sm">{site.period}</p>
          </div>
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <MapPin className="w-5 h-5 text-aegean mx-auto" />
            <p className="text-xs text-text-muted mt-1">{L.location}</p>
            <p className="font-semibold text-sm">{site.city}</p>
          </div>
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Ticket className="w-5 h-5 text-terra mx-auto" />
            <p className="text-xs text-text-muted mt-1">{L.admission}</p>
            <p className="font-semibold text-sm">{displayPrice}</p>
          </div>
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Clock className="w-5 h-5 text-olive mx-auto" />
            <p className="text-xs text-text-muted mt-1">{L.openingHours}</p>
            <p className="font-semibold text-sm">{site.hours}</p>
          </div>
        </div>

        {/* Description */}
        <div className="prose prose-sm max-w-none mb-8">
          <p className="text-text leading-relaxed">{desc}</p>
        </div>

        {/* Highlights */}
        <section className="mb-8">
          <h2
            className="text-xl font-bold text-aegean mb-4"
            style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
          >
            {L.highlights}
          </h2>
          <div className="flex flex-wrap gap-2">
            {site.highlights.map((h) => (
              <span
                key={h}
                className="inline-flex items-center text-sm bg-stone px-3 py-1.5 rounded-full text-text"
              >
                {h}
              </span>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12 mb-8">
          <h2
            className="text-2xl font-bold text-aegean mb-6"
            style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
          >
            {L.faqTitle}
          </h2>
          <div className="space-y-4">
            {faqItems.map((faq, i) => (
              <details key={i} className="group rounded-xl bg-white border border-border p-4">
                <summary className="font-medium text-text cursor-pointer list-none flex items-center justify-between">
                  {faq.q}
                  <ChevronRight className="w-4 h-4 text-text-muted transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm text-text-muted leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Other sites */}
        <section className="mt-8 mb-8">
          <h2
            className="text-2xl font-bold text-aegean mb-4"
            style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
          >
            {L.nearbySites}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherSites.map((s) => (
              <Link
                key={s.slug}
                href={`/${locale}/archaeology/${s.slug}`}
                className="rounded-xl bg-white border border-border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 text-aegean mb-1">
                  <Landmark className="w-4 h-4" />
                  <span className="font-semibold text-sm">{s.name}</span>
                </div>
                <p className="text-xs text-text-muted">{s.period}</p>
                <p className="text-xs text-text-muted mt-1">{s.city} - {s.price === "Free" ? L.free : s.price}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Explore more */}
        <section className="mt-8 pb-8">
          <h2
            className="text-2xl font-bold text-aegean mb-4"
            style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
          >
            {L.exploreMore}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href={`/${locale}/beaches`}
              className="rounded-xl bg-white border border-border p-4 hover:shadow-md transition-shadow flex items-center gap-3"
            >
              <MapPin className="w-5 h-5 text-aegean" />
              <span className="font-medium text-sm text-text">{L.beaches}</span>
            </Link>
            <Link
              href={`/${locale}/itineraries`}
              className="rounded-xl bg-white border border-border p-4 hover:shadow-md transition-shadow flex items-center gap-3"
            >
              <Clock className="w-5 h-5 text-terra" />
              <span className="font-medium text-sm text-text">{L.itineraries}</span>
            </Link>
            <Link
              href={`/${locale}/villages`}
              className="rounded-xl bg-white border border-border p-4 hover:shadow-md transition-shadow flex items-center gap-3"
            >
              <MapPin className="w-5 h-5 text-olive" />
              <span className="font-medium text-sm text-text">{L.villages}</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
