import { MapPin, Bed, Euro, Lightbulb, Umbrella, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbSchema } from "@/lib/schema";
import { AffiliateCTA } from "@/components/ui/affiliate-cta";
import { buildAlternates } from "@/lib/seo";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

/* ------------------------------------------------------------------ */
/*  Localized labels                                                   */
/* ------------------------------------------------------------------ */

type Loc = "en" | "fr" | "de" | "el";

const L: Record<Loc, {
  pageTitle: string;
  backAll: string;
  vibe: string;
  bestFor: string;
  bestArea: string;
  priceRange: string;
  tips: string;
  nearbyBeaches: string;
  faq: string;
  otherAreas: string;
  city: string;
  village: string;
  resort: string;
  crete: string;
  perNight: string;
}> = {
  en: {
    pageTitle: "Where to Stay in",
    backAll: "All areas",
    vibe: "Vibe",
    bestFor: "Best for",
    bestArea: "Best area to stay",
    priceRange: "Price range",
    tips: "Tips",
    nearbyBeaches: "Nearby beaches",
    faq: "FAQ",
    otherAreas: "Other areas in Crete",
    city: "City",
    village: "Village",
    resort: "Resort area",
    crete: "Crete",
    perNight: "per night",
  },
  fr: {
    pageTitle: "Où loger à",
    backAll: "Toutes les zones",
    vibe: "Ambiance",
    bestFor: "Idéal pour",
    bestArea: "Meilleur quartier",
    priceRange: "Gamme de prix",
    tips: "Conseils",
    nearbyBeaches: "Plages à proximité",
    faq: "FAQ",
    otherAreas: "Autres zones en Crète",
    city: "Ville",
    village: "Village",
    resort: "Zone de villégiature",
    crete: "Crète",
    perNight: "par nuit",
  },
  de: {
    pageTitle: "Wo übernachten in",
    backAll: "Alle Gebiete",
    vibe: "Atmosphäre",
    bestFor: "Ideal für",
    bestArea: "Bestes Viertel",
    priceRange: "Preisklasse",
    tips: "Tipps",
    nearbyBeaches: "Strände in der Nähe",
    faq: "FAQ",
    otherAreas: "Andere Gebiete auf Kreta",
    city: "Stadt",
    village: "Dorf",
    resort: "Urlaubsgebiet",
    crete: "Kreta",
    perNight: "pro Nacht",
  },
  el: {
    pageTitle: "Πού να μείνετε στ",
    backAll: "Όλες οι περιοχές",
    vibe: "Ατμόσφαιρα",
    bestFor: "Ιδανικό για",
    bestArea: "Καλύτερη περιοχή",
    priceRange: "Εύρος τιμών",
    tips: "Συμβουλές",
    nearbyBeaches: "Κοντινές παραλίες",
    faq: "FAQ",
    otherAreas: "Άλλες περιοχές στην Κρήτη",
    city: "Πόλη",
    village: "Χωριό",
    resort: "Θέρετρο",
    crete: "Κρήτη",
    perNight: "ανά βράδυ",
  },
};

/* ------------------------------------------------------------------ */
/*  Area data                                                          */
/* ------------------------------------------------------------------ */

interface Area {
  slug: string;
  name: string;
  type: "city" | "village" | "resort";
  vibe: Record<Loc, string>;
  bestFor: Record<Loc, string>;
  priceRange: string;
  bestArea: Record<Loc, string>;
  tips: Record<Loc, string[]>;
  nearbyBeaches: string[];
}

const AREAS: Area[] = [
  {
    slug: "chania",
    name: "Chania",
    type: "city",
    vibe: { en: "Romantic old town, Venetian harbor", fr: "Vieille ville romantique, port vénitien", de: "Romantische Altstadt, venezianischer Hafen", el: "Ρομαντική παλιά πόλη" },
    bestFor: { en: "Couples, history lovers, foodies", fr: "Couples, amoureux d'histoire, gourmets", de: "Paare, Geschichtsliebhaber, Feinschmecker", el: "Ζευγάρια, λάτρεις ιστορίας" },
    priceRange: "€60-200",
    bestArea: { en: "Old Town or Venetian Harbor area", fr: "Vieille ville ou port vénitien", de: "Altstadt oder venezianischer Hafen", el: "Παλιά πόλη ή βενετσιάνικο λιμάνι" },
    tips: {
      en: ["Book harbor-view rooms early in summer", "Old Town can be noisy at night - check reviews", "Nea Chora beach is walkable from the center", "Parking is limited - consider a hotel with parking"],
      fr: ["Réservez les chambres vue port tôt en été", "La vieille ville peut être bruyante la nuit", "La plage Nea Chora est accessible à pied"],
      de: ["Hafenblick-Zimmer früh im Sommer buchen", "Altstadt kann nachts laut sein", "Nea Chora Strand ist zu Fuß erreichbar"],
      el: ["Κλείστε δωμάτια με θέα λιμάνι νωρίς", "Η παλιά πόλη μπορεί να είναι θορυβώδης"],
    },
    nearbyBeaches: ["Nea Chora", "Kalamaki", "Agioi Apostoloi", "Marathi"],
  },
  {
    slug: "heraklion",
    name: "Heraklion",
    type: "city",
    vibe: { en: "Urban, buzzing capital with history", fr: "Capitale urbaine et animée", de: "Urbane, geschäftige Hauptstadt", el: "Αστική, πολυσύχναστη πρωτεύουσα" },
    bestFor: { en: "History buffs, central base, airport proximity", fr: "Passionnés d'histoire, base centrale, proche aéroport", de: "Geschichtsfans, zentrale Lage, Flughafennähe", el: "Λάτρεις ιστορίας, κεντρική βάση" },
    priceRange: "€50-150",
    bestArea: { en: "Near Lions Square or the waterfront", fr: "Près de la place des Lions ou du front de mer", de: "Nahe Löwenplatz oder Uferpromenade", el: "Κοντά στην Πλατεία Λιονταριών" },
    tips: {
      en: ["Best base for visiting Knossos (15 min)", "Waterfront hotels have the best views", "Central location = easy day trips east and west"],
      fr: ["Meilleure base pour Knossos (15 min)", "Les hôtels du front de mer ont les meilleures vues"],
      de: ["Beste Basis für Knossos (15 Min)", "Uferhotels haben die beste Aussicht"],
      el: ["Ιδανική βάση για Κνωσό (15 λεπτά)"],
    },
    nearbyBeaches: ["Ammoudara", "Agia Pelagia", "Karteros", "Kokkini Hani"],
  },
  {
    slug: "rethymno",
    name: "Rethymno",
    type: "city",
    vibe: { en: "Charming university town, long beach", fr: "Charmante ville universitaire, longue plage", de: "Charmante Universitätsstadt, langer Strand", el: "Γοητευτική πανεπιστημιακή πόλη" },
    bestFor: { en: "Families, beach + culture combo", fr: "Familles, combo plage + culture", de: "Familien, Strand + Kultur Kombination", el: "Οικογένειες, παραλία + πολιτισμός" },
    priceRange: "€50-180",
    bestArea: { en: "Old Town or beachfront", fr: "Vieille ville ou front de mer", de: "Altstadt oder Strandpromenade", el: "Παλιά πόλη ή παραλία" },
    tips: {
      en: ["Town beach is right at your doorstep", "The Fortezza has sunset views", "Good central base between Chania and Heraklion"],
      fr: ["La plage est juste devant vous", "La Fortezza offre des couchers de soleil"],
      de: ["Stadtstrand direkt vor der Tür", "Die Fortezza bietet Sonnenuntergänge"],
      el: ["Η παραλία είναι μπροστά σας"],
    },
    nearbyBeaches: ["Rethymno Town Beach", "Preveli", "Plakias", "Bali"],
  },
  {
    slug: "agios-nikolaos",
    name: "Agios Nikolaos",
    type: "city",
    vibe: { en: "Picturesque lakeside town, upscale", fr: "Ville pittoresque au bord du lac", de: "Malerische Stadt am See", el: "Γραφική πόλη δίπλα στη λίμνη" },
    bestFor: { en: "Couples, Spinalonga access, east Crete base", fr: "Couples, accès Spinalonga, base est Crète", de: "Paare, Spinalonga-Zugang, Ostkreta-Basis", el: "Ζευγάρια, πρόσβαση Σπιναλόγκα" },
    priceRange: "€50-200",
    bestArea: { en: "Around Lake Voulismeni or the marina", fr: "Autour du lac Voulismeni ou de la marina", de: "Um den Voulismeni-See oder die Marina", el: "Γύρω από τη λίμνη Βουλισμένη" },
    tips: {
      en: ["Lake Voulismeni is the heart of town", "Easy boat trips to Spinalonga from here", "Elounda is 10 min north for luxury options"],
      fr: ["Le lac Voulismeni est le cœur de la ville", "Excursions en bateau vers Spinalonga"],
      de: ["Der Voulismeni-See ist das Herz der Stadt"],
      el: ["Η λίμνη Βουλισμένη είναι η καρδιά της πόλης"],
    },
    nearbyBeaches: ["Almyros", "Ammoudi", "Voulisma", "Istro"],
  },
  {
    slug: "elounda",
    name: "Elounda",
    type: "resort",
    vibe: { en: "Luxury resort area, exclusive", fr: "Zone de villégiature luxueuse", de: "Luxuriöses Urlaubsgebiet", el: "Πολυτελής περιοχή" },
    bestFor: { en: "Luxury travelers, honeymoons", fr: "Voyageurs de luxe, lunes de miel", de: "Luxusreisende, Flitterwochen", el: "Πολυτελείς ταξιδιώτες" },
    priceRange: "€150-800+",
    bestArea: { en: "Along the coast between Elounda and Plaka", fr: "Le long de la côte entre Elounda et Plaka", de: "Entlang der Küste zwischen Elounda und Plaka", el: "Κατά μήκος της ακτής" },
    tips: {
      en: ["Some of Greece's most exclusive hotels are here", "Plaka village is quieter and more authentic", "Boat to Spinalonga takes 15 minutes"],
      fr: ["Certains des hôtels les plus exclusifs de Grèce", "Plaka est plus calme et authentique"],
      de: ["Einige der exklusivsten Hotels Griechenlands"],
      el: ["Μερικά από τα πιο αποκλειστικά ξενοδοχεία"],
    },
    nearbyBeaches: ["Elounda Beach", "Kolokytha", "Plaka", "Kalydon"],
  },
  {
    slug: "plakias",
    name: "Plakias",
    type: "village",
    vibe: { en: "Relaxed beach village, south coast", fr: "Village balnéaire détendu, côte sud", de: "Entspanntes Stranddorf, Südküste", el: "Χαλαρό παραθαλάσσιο χωριό" },
    bestFor: { en: "Budget travelers, hikers, quiet beach holiday", fr: "Petits budgets, randonneurs, vacances tranquilles", de: "Budgetreisende, Wanderer, ruhiger Strandurlaub", el: "Οικονομικοί ταξιδιώτες, πεζοπόροι" },
    priceRange: "€40-120",
    bestArea: { en: "Along Plakias beach or in Sellia above", fr: "Le long de la plage ou à Sellia", de: "Entlang des Strandes oder in Sellia", el: "Κατά μήκος της παραλίας" },
    tips: {
      en: ["Great base for Preveli Beach and Kourtaliotiko Gorge", "Less touristy than the north coast", "Damnoni Beach is a 5-minute drive"],
      fr: ["Base idéale pour Preveli et les gorges", "Moins touristique que la côte nord"],
      de: ["Tolle Basis für Preveli und Kourtaliotiko-Schlucht"],
      el: ["Ιδανική βάση για Πρέβελη"],
    },
    nearbyBeaches: ["Plakias", "Damnoni", "Preveli", "Souda"],
  },
  {
    slug: "paleochora",
    name: "Paleochora",
    type: "village",
    vibe: { en: "Hippie charm, two beaches, end of the world feel", fr: "Charme hippie, deux plages, bout du monde", de: "Hippie-Charme, zwei Strände, Weltende-Gefühl", el: "Χίπικη γοητεία, δύο παραλίες" },
    bestFor: { en: "Alternative travelers, long stays, digital nomads", fr: "Voyageurs alternatifs, longs séjours", de: "Alternative Reisende, Langzeitaufenthalte", el: "Εναλλακτικοί ταξιδιώτες" },
    priceRange: "€35-100",
    bestArea: { en: "Near the sandy beach (west) or pebble beach (east)", fr: "Près de la plage de sable (ouest) ou galets (est)", de: "Nahe Sandstrand (West) oder Kiesstrand (Ost)", el: "Κοντά στην αμμώδη (δυτική) ή βοτσαλωτή (ανατολική)" },
    tips: {
      en: ["Two beaches to choose from depending on wind", "Ferry to Gavdos (southernmost point of Europe)", "E4 trail passes through here"],
      fr: ["Deux plages selon le vent", "Ferry vers Gavdos"],
      de: ["Zwei Strände je nach Wind", "Fähre nach Gavdos"],
      el: ["Δύο παραλίες ανάλογα τον αέρα"],
    },
    nearbyBeaches: ["Pahia Ammos", "Pebble Beach", "Gialiskari", "Grammeno"],
  },
  {
    slug: "matala",
    name: "Matala",
    type: "village",
    vibe: { en: "Famous hippie caves, sunset beach", fr: "Grottes hippies célèbres, plage de coucher de soleil", de: "Berühmte Hippie-Höhlen, Sonnenuntergangsstrand", el: "Διάσημες σπηλιές χίπηδων" },
    bestFor: { en: "History + beach combo, sunset lovers", fr: "Combo histoire + plage, amoureux du coucher de soleil", de: "Geschichte + Strand Kombination", el: "Ιστορία + παραλία, ηλιοβασιλέματα" },
    priceRange: "€40-120",
    bestArea: { en: "Along the main beach road", fr: "Le long de la route principale de la plage", de: "Entlang der Hauptstrandstraße", el: "Κατά μήκος του κεντρικού δρόμου" },
    tips: {
      en: ["The hippie caves are free to visit", "Red Beach is a 20-min hike south", "Phaistos Palace is 15 min drive"],
      fr: ["Les grottes hippies sont gratuites", "Red Beach à 20 min de marche"],
      de: ["Die Hippie-Höhlen sind kostenlos", "Red Beach ist 20 Min Fußweg"],
      el: ["Οι σπηλιές είναι δωρεάν"],
    },
    nearbyBeaches: ["Matala", "Red Beach", "Kommos", "Kalamaki"],
  },
];

function getArea(slug: string): Area | undefined {
  return AREAS.find((a) => a.slug === slug);
}

/* ------------------------------------------------------------------ */
/*  generateStaticParams                                               */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return AREAS.map((a) => ({ area: a.slug }));
}

/* ------------------------------------------------------------------ */
/*  SEO metadata                                                       */
/* ------------------------------------------------------------------ */

const META: Record<Loc, { title: (name: string) => string; desc: (name: string, vibe: string) => string }> = {
  en: {
    title: (name) => `Where to Stay in ${name}, Crete - Best Areas & Tips`,
    desc: (name, vibe) => `Find the best area to stay in ${name}, Crete. ${vibe}. Price ranges, local tips, and nearby beaches.`,
  },
  fr: {
    title: (name) => `Où loger à ${name}, Crète - Meilleurs quartiers & conseils`,
    desc: (name, vibe) => `Trouvez le meilleur quartier où loger à ${name}, Crète. ${vibe}. Gammes de prix, conseils locaux et plages à proximité.`,
  },
  de: {
    title: (name) => `Wo übernachten in ${name}, Kreta - Beste Gegenden & Tipps`,
    desc: (name, vibe) => `Finden Sie die beste Gegend zum Übernachten in ${name}, Kreta. ${vibe}. Preisklassen, lokale Tipps und nahe Strände.`,
  },
  el: {
    title: (name) => `Πού να μείνετε στ${name.match(/^[ΑΕΗΙΟΥΩΆΈΉΊΌΎΏ]/i) ? "ο" : "ην"} ${name}, Κρήτη`,
    desc: (name, vibe) => `Βρείτε την καλύτερη περιοχή για διαμονή στ${name.match(/^[ΑΕΗΙΟΥΩΆΈΉΊΌΎΏ]/i) ? "ο" : "ην"} ${name}, Κρήτη. ${vibe}.`,
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; area: string }>;
}) {
  const { locale, area: areaSlug } = await params;
  const area = getArea(areaSlug);
  if (!area) return { title: "Not found" };

  const loc = (["en", "fr", "de", "el"].includes(locale) ? locale : "en") as Loc;
  const meta = META[loc];
  const title = `${meta.title(area.name)} | Crete Direct`;
  const description = meta.desc(area.name, area.vibe[loc]);
  const url = `${BASE_URL}/${locale}/where-to-stay/${area.slug}`;

  return {
    title,
    description,
    alternates: buildAlternates(locale, `/where-to-stay/${area.slug}`),
    openGraph: { title, description, url, type: "website" },
  };
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default async function WhereToStayAreaPage({
  params,
}: {
  params: Promise<{ locale: string; area: string }>;
}) {
  const { locale, area: areaSlug } = await params;
  const area = getArea(areaSlug);
  if (!area) notFound();

  const loc = (["en", "fr", "de", "el"].includes(locale) ? locale : "en") as Loc;
  const labels = L[loc];
  const typeLabel = area.type === "city" ? labels.city : area.type === "village" ? labels.village : labels.resort;

  /* Breadcrumb structured data */
  const breadcrumb = breadcrumbSchema([
    { name: "Crete Direct", url: `${BASE_URL}/${locale}` },
    { name: labels.pageTitle, url: `${BASE_URL}/${locale}/where-to-stay` },
    { name: area.name, url: `${BASE_URL}/${locale}/where-to-stay/${area.slug}` },
  ]);

  /* FAQ structured data */
  const faqItems = buildFaq(area, loc);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  /* TouristDestination schema */
  const destinationSchema = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: `${area.name}, Crete`,
    description: area.vibe[loc],
    touristType: area.bestFor[loc],
    address: {
      "@type": "PostalAddress",
      addressLocality: area.name,
      addressRegion: "Crete",
      addressCountry: "GR",
    },
  };

  const otherAreas = AREAS.filter((a) => a.slug !== area.slug);

  return (
    <main className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(destinationSchema) }}
      />

      {/* Hero */}
      <div className="bg-aegean text-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <span className="inline-block bg-white/15 text-white/90 text-xs font-medium px-3 py-1 rounded-full mb-4">
            {typeLabel}
          </span>
          <h1
            className="text-3xl md:text-5xl font-bold mb-3"
            style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
          >
            {labels.pageTitle} {area.name}
          </h1>
          <p className="text-lg text-white/80 max-w-2xl">{area.vibe[loc]}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href={`/${locale}/where-to-stay`}
          className="inline-flex items-center gap-1 text-sm text-aegean hover:underline mb-8"
        >
          <ChevronLeft className="w-4 h-4" /> {labels.backAll}
        </Link>

        {/* Info cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {/* Best area card */}
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-aegean" />
              <h2 className="font-semibold text-aegean">{labels.bestArea}</h2>
            </div>
            <p className="text-sm text-text leading-relaxed">{area.bestArea[loc]}</p>
          </div>

          {/* Best for card */}
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="flex items-center gap-2 mb-2">
              <Bed className="w-5 h-5 text-terra" />
              <h2 className="font-semibold text-aegean">{labels.bestFor}</h2>
            </div>
            <p className="text-sm text-text leading-relaxed">{area.bestFor[loc]}</p>
          </div>
        </div>

        {/* Price range */}
        <div className="rounded-xl border border-border bg-white p-5 mb-10 max-w-sm">
          <div className="flex items-center gap-2 mb-2">
            <Euro className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-aegean">{labels.priceRange}</h2>
          </div>
          <p className="text-2xl font-bold text-text">
            {area.priceRange}
            <span className="text-sm font-normal text-text-muted ml-2">{labels.perNight}</span>
          </p>
        </div>

        {/* Tips */}
        {area.tips[loc].length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold text-aegean">{labels.tips}</h2>
            </div>
            <ul className="space-y-2">
              {area.tips[loc].map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-text leading-relaxed">
                  <ChevronRight className="w-4 h-4 text-aegean mt-0.5 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Nearby beaches */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Umbrella className="w-5 h-5 text-aegean" />
            <h2 className="text-xl font-bold text-aegean">{labels.nearbyBeaches}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {area.nearbyBeaches.map((beach) => {
              const beachSlug = beach.toLowerCase().replace(/\s+/g, "-");
              return (
                <Link
                  key={beach}
                  href={`/${locale}/beaches/${beachSlug}`}
                  className="inline-flex items-center gap-1.5 text-sm bg-white border border-border rounded-full px-4 py-2 hover:border-aegean/40 transition-colors"
                >
                  <Umbrella className="w-3.5 h-3.5 text-aegean" />
                  {beach}
                </Link>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-aegean mb-4">{labels.faq}</h2>
          <div className="space-y-3">
            {faqItems.map((faq, i) => (
              <div key={i} className="p-4 bg-white rounded-xl border border-border">
                <h3 className="font-semibold text-sm text-text mb-1">{faq.q}</h3>
                <p className="text-sm text-text-muted">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Property management CTA */}
        <div className="mb-10">
          <AffiliateCTA type="propertyManagement" locale={locale} />
        </div>

        {/* Other areas */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-aegean mb-4">{labels.otherAreas}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {otherAreas.map((a) => (
              <Link
                key={a.slug}
                href={`/${locale}/where-to-stay/${a.slug}`}
                className="rounded-xl border border-border bg-white p-3 hover:border-aegean/30 transition-all"
              >
                <p className="font-semibold text-sm">{a.name}</p>
                <p className="text-xs text-text-muted">{a.vibe[loc]}</p>
                <p className="text-xs text-aegean mt-1">{a.priceRange}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ builder                                                        */
/* ------------------------------------------------------------------ */

function buildFaq(area: Area, loc: Loc): Array<{ q: string; a: string }> {
  const n = area.name;

  const faq: Record<Loc, Array<{ q: string; a: string }>> = {
    en: [
      {
        q: `Where is the best area to stay in ${n}?`,
        a: `The best area to stay in ${n} is ${area.bestArea.en}. This area offers easy access to attractions, restaurants, and beaches.`,
      },
      {
        q: `How much does accommodation cost in ${n}?`,
        a: `Accommodation in ${n} typically ranges from ${area.priceRange} per night, depending on the season and type of property.`,
      },
      {
        q: `Is ${n} good for families?`,
        a: area.bestFor.en.toLowerCase().includes("famil")
          ? `Yes, ${n} is great for families. ${area.vibe.en}. Nearby beaches include ${area.nearbyBeaches.join(", ")}.`
          : `${n} is best suited for ${area.bestFor.en.toLowerCase()}. Families may prefer areas like Rethymno or Plakias for more family-oriented facilities.`,
      },
      {
        q: `What beaches are near ${n}?`,
        a: `The closest beaches to ${n} are ${area.nearbyBeaches.join(", ")}. All are easily accessible by car or public transport.`,
      },
    ],
    fr: [
      {
        q: `Quel est le meilleur quartier où loger à ${n} ?`,
        a: `Le meilleur quartier pour se loger à ${n} est ${area.bestArea.fr}. Cette zone offre un accès facile aux attractions, restaurants et plages.`,
      },
      {
        q: `Combien coûte un hébergement à ${n} ?`,
        a: `L'hébergement à ${n} coûte généralement entre ${area.priceRange} par nuit, selon la saison et le type de logement.`,
      },
      {
        q: `${n} est-elle adaptée aux familles ?`,
        a: area.bestFor.fr.toLowerCase().includes("famil")
          ? `Oui, ${n} est idéale pour les familles. ${area.vibe.fr}. Les plages proches incluent ${area.nearbyBeaches.join(", ")}.`
          : `${n} convient surtout aux ${area.bestFor.fr.toLowerCase()}. Les familles préféreront peut-être Réthymnon ou Plakias.`,
      },
      {
        q: `Quelles plages sont proches de ${n} ?`,
        a: `Les plages les plus proches de ${n} sont ${area.nearbyBeaches.join(", ")}. Toutes sont facilement accessibles en voiture ou en transport.`,
      },
    ],
    de: [
      {
        q: `Wo ist die beste Gegend zum Übernachten in ${n}?`,
        a: `Die beste Gegend in ${n} ist ${area.bestArea.de}. Hier haben Sie einfachen Zugang zu Sehenswürdigkeiten, Restaurants und Stränden.`,
      },
      {
        q: `Wie viel kostet eine Unterkunft in ${n}?`,
        a: `Unterkünfte in ${n} kosten typischerweise ${area.priceRange} pro Nacht, je nach Saison und Unterkunftsart.`,
      },
      {
        q: `Ist ${n} gut für Familien?`,
        a: area.bestFor.de.toLowerCase().includes("famil")
          ? `Ja, ${n} ist ideal für Familien. ${area.vibe.de}. Nahe Strände sind ${area.nearbyBeaches.join(", ")}.`
          : `${n} eignet sich am besten für ${area.bestFor.de.toLowerCase()}. Familien bevorzugen vielleicht Rethymno oder Plakias.`,
      },
      {
        q: `Welche Strände sind in der Nähe von ${n}?`,
        a: `Die nächsten Strände zu ${n} sind ${area.nearbyBeaches.join(", ")}. Alle sind gut mit dem Auto oder Bus erreichbar.`,
      },
    ],
    el: [
      {
        q: `Ποια είναι η καλύτερη περιοχή για διαμονή στ${n.match(/^[ΑΕΗΙΟΥΩΆΈΉΊΌΎΏ]/i) ? "ο" : "ην"} ${n};`,
        a: `Η καλύτερη περιοχή για διαμονή στ${n.match(/^[ΑΕΗΙΟΥΩΆΈΉΊΌΎΏ]/i) ? "ο" : "ην"} ${n} είναι ${area.bestArea.el}. Εύκολη πρόσβαση σε αξιοθέατα, εστιατόρια και παραλίες.`,
      },
      {
        q: `Πόσο κοστίζει η διαμονή στ${n.match(/^[ΑΕΗΙΟΥΩΆΈΉΊΌΎΏ]/i) ? "ο" : "ην"} ${n};`,
        a: `Η διαμονή στ${n.match(/^[ΑΕΗΙΟΥΩΆΈΉΊΌΎΏ]/i) ? "ο" : "ην"} ${n} κοστίζει συνήθως ${area.priceRange} ανά βράδυ, ανάλογα με την εποχή.`,
      },
      {
        q: `Ποιες παραλίες είναι κοντά στ${n.match(/^[ΑΕΗΙΟΥΩΆΈΉΊΌΎΏ]/i) ? "ο" : "ην"} ${n};`,
        a: `Οι κοντινότερες παραλίες στ${n.match(/^[ΑΕΗΙΟΥΩΆΈΉΊΌΎΏ]/i) ? "ο" : "ην"} ${n} είναι ${area.nearbyBeaches.join(", ")}.`,
      },
    ],
  };

  return faq[loc];
}
