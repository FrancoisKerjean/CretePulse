import type { Locale } from "@/lib/types";
import Link from "next/link";
import { Waves, Mountain, UtensilsCrossed, TreePine, MapPin } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Interactive Map of Crete - Beaches, Villages, Food, Hikes | Crete Direct",
    desc: "Explore Crete on a map: beaches, traditional villages, local restaurants and hiking trails. Find the best spots across east, west, south and central Crete.",
  },
  fr: {
    title: "Carte Interactive de la Crète - Plages, Villages, Cuisine, Randonnées | Crete Direct",
    desc: "Explorez la Crète sur la carte : plages, villages traditionnels, restaurants locaux et sentiers de randonnée. Trouvez les meilleurs spots.",
  },
  de: {
    title: "Interaktive Karte von Kreta - Strände, Dörfer, Essen, Wanderungen | Crete Direct",
    desc: "Entdecken Sie Kreta auf der Karte: Strände, traditionelle Dörfer, lokale Restaurants und Wanderwege. Finden Sie die besten Orte.",
  },
  el: {
    title: "Διαδραστικός Χάρτης Κρήτης - Παραλίες, Χωριά, Φαγητό, Πεζοπορία | Crete Direct",
    desc: "Εξερευνήστε την Κρήτη στον χάρτη: παραλίες, παραδοσιακά χωριά, εστιατόρια και μονοπάτια πεζοπορίας.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const m = META[locale] || META.en;
  const url = `${BASE_URL}/${locale}/map`;
  return {
    title: m.title,
    description: m.desc,
    alternates: { canonical: url },
    openGraph: { title: m.title, description: m.desc, url, type: "website" },
  };
}

type Category = "beaches" | "villages" | "food" | "hikes";

interface MapItem {
  name: Record<Locale, string>;
  slug: string;
  category: Category;
  lat: number;
  lng: number;
  description: Record<Locale, string>;
}

const MAP_ITEMS: MapItem[] = [
  // Beaches
  {
    name: { en: "Balos Lagoon", fr: "Lagon de Balos", de: "Balos Lagune", el: "Μπάλος" },
    slug: "balos",
    category: "beaches",
    lat: 35.5783,
    lng: 23.5883,
    description: {
      en: "Iconic turquoise lagoon in northwest Crete. Pink-tinged sand, shallow water.",
      fr: "Lagon turquoise iconique au nord-ouest. Sable rosé, eaux peu profondes.",
      de: "Ikonische türkise Lagune im Nordwesten. Rosa Sand, flaches Wasser.",
      el: "Εμβληματική τυρκουάζ λιμνοθάλασσα στα βορειοδυτικά. Ροζ άμμος.",
    },
  },
  {
    name: { en: "Elafonissi", fr: "Elafonissi", de: "Elafonissi", el: "Ελαφονήσι" },
    slug: "elafonissi",
    category: "beaches",
    lat: 35.2725,
    lng: 23.5417,
    description: {
      en: "Famous pink sand beach on the southwest tip. Crystal-clear shallow water, ideal for families.",
      fr: "Célèbre plage de sable rose au sud-ouest. Eau cristalline peu profonde, idéale en famille.",
      de: "Berühmter rosa Sandstrand an der Südwestspitze. Kristallklares flaches Wasser.",
      el: "Φημισμένη παραλία με ροζ άμμο στα νοτιοδυτικά. Ρηχά κρυστάλλινα νερά.",
    },
  },
  {
    name: { en: "Vai Palm Beach", fr: "Plage de Vai", de: "Vai Palmenstrand", el: "Βάι" },
    slug: "vai",
    category: "beaches",
    lat: 35.2558,
    lng: 26.2647,
    description: {
      en: "Europe's largest natural palm forest meets a sandy beach in east Crete.",
      fr: "La plus grande palmeraie naturelle d'Europe rencontre une plage de sable à l'est.",
      de: "Europas größter natürlicher Palmenwald trifft auf einen Sandstrand im Osten Kretas.",
      el: "Το μεγαλύτερο φυσικό φοινικόδασος της Ευρώπης στην ανατολική Κρήτη.",
    },
  },
  {
    name: { en: "Preveli Beach", fr: "Plage de Preveli", de: "Preveli Strand", el: "Πρέβελη" },
    slug: "preveli",
    category: "beaches",
    lat: 35.1550,
    lng: 24.4736,
    description: {
      en: "River-fed beach surrounded by palm trees and dramatic cliffs on the south coast.",
      fr: "Plage alimentée par une rivière, entourée de palmiers et de falaises dramatiques.",
      de: "Flussstrand umgeben von Palmen und dramatischen Klippen an der Südküste.",
      el: "Παραλία με ποτάμι, φοίνικες και εντυπωσιακούς βράχους στη νότια ακτή.",
    },
  },
  {
    name: { en: "Seitan Limania", fr: "Seitan Limania", de: "Seitan Limania", el: "Σεϊτάν Λιμάνια" },
    slug: "seitan-limania",
    category: "beaches",
    lat: 35.5583,
    lng: 24.1453,
    description: {
      en: "Hidden cove with dramatic turquoise water near Chania. Steep access, worth the effort.",
      fr: "Crique cachée aux eaux turquoise près de La Canée. Accès raide mais ça vaut le coup.",
      de: "Versteckte Bucht mit türkisem Wasser nahe Chania. Steiler Zugang, lohnt sich.",
      el: "Κρυφός κόλπος με τυρκουάζ νερά κοντά στα Χανιά. Απότομη πρόσβαση.",
    },
  },
  // Villages
  {
    name: { en: "Archanes", fr: "Archanes", de: "Archanes", el: "Αρχάνες" },
    slug: "archanes",
    category: "villages",
    lat: 35.2364,
    lng: 25.1606,
    description: {
      en: "Award-winning wine village south of Heraklion. Restored Venetian architecture, excellent tavernas.",
      fr: "Village viticole primé au sud d'Héraklion. Architecture vénitienne restaurée, excellentes tavernes.",
      de: "Preisgekröntes Weindorf südlich von Heraklion. Restaurierte venezianische Architektur.",
      el: "Βραβευμένο οινικό χωριό νότια του Ηρακλείου. Βενετσιάνικη αρχιτεκτονική.",
    },
  },
  {
    name: { en: "Loutro", fr: "Loutro", de: "Loutro", el: "Λουτρό" },
    slug: "loutro",
    category: "villages",
    lat: 35.2033,
    lng: 24.0758,
    description: {
      en: "Car-free fishing village on the south coast. Only accessible by boat or hiking trail.",
      fr: "Village de pêcheurs sans voiture sur la côte sud. Accessible uniquement par bateau ou sentier.",
      de: "Autofreies Fischerdorf an der Südküste. Nur per Boot oder Wanderweg erreichbar.",
      el: "Χωριό χωρίς αυτοκίνητα στη νότια ακτή. Πρόσβαση μόνο με πλοίο ή πεζοπορία.",
    },
  },
  {
    name: { en: "Margarites", fr: "Margarites", de: "Margarites", el: "Μαργαρίτες" },
    slug: "margarites",
    category: "villages",
    lat: 35.3611,
    lng: 24.6372,
    description: {
      en: "Traditional pottery village near Rethymno. Watch artisans at work, buy handmade ceramics.",
      fr: "Village de potiers traditionnel près de Réthymno. Artisans au travail, céramiques faites main.",
      de: "Traditionelles Töpferdorf bei Rethymno. Handwerker bei der Arbeit, handgemachte Keramik.",
      el: "Παραδοσιακό χωριό κεραμικής κοντά στο Ρέθυμνο. Χειροποίητα κεραμικά.",
    },
  },
  {
    name: { en: "Spinalonga", fr: "Spinalonga", de: "Spinalonga", el: "Σπιναλόγκα" },
    slug: "spinalonga",
    category: "villages",
    lat: 35.2981,
    lng: 25.7439,
    description: {
      en: "Historic island fortress near Elounda. Former leper colony, now a fascinating open-air museum.",
      fr: "Forteresse insulaire historique près d'Elounda. Ancienne léproserie, musée en plein air.",
      de: "Historische Inselfestung bei Elounda. Ehemalige Leprakolonie, faszinierendes Freilichtmuseum.",
      el: "Ιστορικό νησάκι-φρούριο κοντά στην Ελούντα. Πρώην λεπροκομείο, ανοιχτό μουσείο.",
    },
  },
  // Food
  {
    name: { en: "Heraklion Central Market", fr: "Marché Central d'Héraklion", de: "Zentralmarkt Heraklion", el: "Κεντρική Αγορά Ηρακλείου" },
    slug: "heraklion-central-market",
    category: "food",
    lat: 35.3399,
    lng: 25.1336,
    description: {
      en: "Historic 1866 Street market. Local cheese, olives, herbs, honey and traditional pastries.",
      fr: "Marché historique de la rue 1866. Fromages locaux, olives, herbes, miel et pâtisseries.",
      de: "Historischer Markt in der 1866-Straße. Lokaler Käse, Oliven, Kräuter, Honig, Gebäck.",
      el: "Ιστορική αγορά στην οδό 1866. Τοπικά τυριά, ελιές, μυρωδικά, μέλι, γλυκά.",
    },
  },
  {
    name: { en: "Chania Old Harbor", fr: "Vieux Port de La Canée", de: "Alter Hafen von Chania", el: "Παλιό Λιμάνι Χανίων" },
    slug: "chania-old-harbor",
    category: "food",
    lat: 35.5178,
    lng: 24.0175,
    description: {
      en: "Venetian harbor lined with seafood restaurants and atmospheric tavernas. Iconic lighthouse.",
      fr: "Port vénitien bordé de restaurants de fruits de mer et tavernes. Phare emblématique.",
      de: "Venezianischer Hafen mit Fischrestaurants und stimmungsvollen Tavernen. Ikonischer Leuchtturm.",
      el: "Βενετσιάνικο λιμάνι με ψαροταβέρνες. Εμβληματικός φάρος.",
    },
  },
  {
    name: { en: "Rethymno Old Town", fr: "Vieille Ville de Réthymno", de: "Altstadt Rethymno", el: "Παλιά Πόλη Ρεθύμνου" },
    slug: "rethymno-old-town",
    category: "food",
    lat: 35.3694,
    lng: 24.4736,
    description: {
      en: "Charming old town with hidden courtyards, wine bars and traditional Cretan restaurants.",
      fr: "Vieille ville charmante avec cours cachées, bars à vin et restaurants crétois traditionnels.",
      de: "Charmante Altstadt mit versteckten Innenhöfen, Weinbars und traditionellen Restaurants.",
      el: "Γοητευτική παλιά πόλη με κρυφές αυλές, wine bars και παραδοσιακά εστιατόρια.",
    },
  },
  {
    name: { en: "Sitia Wine Country", fr: "Vignoble de Sitia", de: "Weinland Sitia", el: "Οινοχώρα Σητείας" },
    slug: "sitia-wine-country",
    category: "food",
    lat: 35.2064,
    lng: 26.1028,
    description: {
      en: "Eastern Crete wine region. Local Vidiano and Vilana grapes. Visit small family wineries.",
      fr: "Région viticole de Crète orientale. Cépages Vidiano et Vilana. Petits domaines familiaux.",
      de: "Ostkretas Weinregion. Lokale Vidiano- und Vilana-Trauben. Familienweingüter besuchen.",
      el: "Οινική περιοχή ανατολικής Κρήτης. Βιδιανό και Βηλάνα. Μικρά οικογενειακά οινοποιεία.",
    },
  },
  // Hikes
  {
    name: { en: "Samaria Gorge", fr: "Gorges de Samaria", de: "Samaria-Schlucht", el: "Φαράγγι Σαμαριάς" },
    slug: "samaria-gorge",
    category: "hikes",
    lat: 35.2975,
    lng: 23.9628,
    description: {
      en: "Europe's longest gorge (16 km). Full-day hike through dramatic landscapes. Open May-October.",
      fr: "Plus long canyon d'Europe (16 km). Randonnée à la journée. Ouvert mai-octobre.",
      de: "Europas längste Schlucht (16 km). Ganztageswanderung. Geöffnet Mai-Oktober.",
      el: "Το μακρύτερο φαράγγι της Ευρώπης (16 χλμ). Ημερήσια πεζοπορία. Μάιος-Οκτώβριος.",
    },
  },
  {
    name: { en: "Imbros Gorge", fr: "Gorges d'Imbros", de: "Imbros-Schlucht", el: "Φαράγγι Ίμβρου" },
    slug: "imbros-gorge",
    category: "hikes",
    lat: 35.2617,
    lng: 24.1636,
    description: {
      en: "Easier alternative to Samaria (8 km, 2-3 hours). Dramatic narrow passages, suitable for families.",
      fr: "Alternative plus facile à Samaria (8 km, 2-3h). Passages étroits, adapté aux familles.",
      de: "Leichtere Alternative zu Samaria (8 km, 2-3 Std). Enge Passagen, familienfreundlich.",
      el: "Ευκολότερη εναλλακτική της Σαμαριάς (8 χλμ, 2-3 ώρες). Κατάλληλο για οικογένειες.",
    },
  },
  {
    name: { en: "E4 Trail - Loutro to Agia Roumeli", fr: "Sentier E4 - Loutro à Agia Roumeli", de: "E4-Weg - Loutro nach Agia Roumeli", el: "Μονοπάτι Ε4 - Λουτρό προς Αγία Ρουμέλη" },
    slug: "e4-loutro-agia-roumeli",
    category: "hikes",
    lat: 35.2000,
    lng: 24.0500,
    description: {
      en: "Stunning coastal section of the European E4 trail. 5-6 hours along dramatic south coast cliffs.",
      fr: "Section côtière spectaculaire du sentier européen E4. 5-6h le long des falaises sud.",
      de: "Atemberaubender Küstenabschnitt des E4-Wegs. 5-6 Stunden an der dramatischen Südküste.",
      el: "Εκπληκτικό παράκτιο τμήμα του Ε4. 5-6 ώρες κατά μήκος των βράχων της νότιας ακτής.",
    },
  },
  {
    name: { en: "Agia Irini Gorge", fr: "Gorges d'Agia Irini", de: "Agia-Irini-Schlucht", el: "Φαράγγι Αγίας Ειρήνης" },
    slug: "agia-irini-gorge",
    category: "hikes",
    lat: 35.3381,
    lng: 23.8472,
    description: {
      en: "Beautiful 7.5 km gorge near Sougia. Less crowded than Samaria, rich in wildflowers and wildlife.",
      fr: "Beau canyon de 7,5 km près de Sougia. Moins fréquenté que Samaria, riche en flore et faune.",
      de: "Schöne 7,5 km Schlucht nahe Sougia. Weniger überlaufen als Samaria, reich an Flora und Fauna.",
      el: "Όμορφο φαράγγι 7,5 χλμ κοντά στη Σούγια. Λιγότερος κόσμος, πλούσια χλωρίδα.",
    },
  },
];

const CATEGORY_CONFIG: Record<Category, { icon: typeof Waves; color: string; label: Record<Locale, string>; path: string }> = {
  beaches: {
    icon: Waves,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    label: { en: "Beaches", fr: "Plages", de: "Strände", el: "Παραλίες" },
    path: "/beaches",
  },
  villages: {
    icon: Mountain,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    label: { en: "Villages", fr: "Villages", de: "Dörfer", el: "Χωριά" },
    path: "/villages",
  },
  food: {
    icon: UtensilsCrossed,
    color: "bg-red-50 text-red-700 border-red-200",
    label: { en: "Food", fr: "Cuisine", de: "Essen", el: "Φαγητό" },
    path: "/food",
  },
  hikes: {
    icon: TreePine,
    color: "bg-green-50 text-green-700 border-green-200",
    label: { en: "Hikes", fr: "Randonnées", de: "Wanderungen", el: "Πεζοπορία" },
    path: "/hikes",
  },
};

const CATEGORIES: Category[] = ["beaches", "villages", "food", "hikes"];

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;

  const pageTitle: Record<Locale, string> = {
    en: "Map of Crete",
    fr: "Carte de la Crète",
    de: "Karte von Kreta",
    el: "Χάρτης Κρήτης",
  };

  const comingSoon: Record<Locale, string> = {
    en: "Interactive map coming soon. Browse by category below.",
    fr: "Carte interactive bientôt disponible. Parcourez par catégorie ci-dessous.",
    de: "Interaktive Karte kommt bald. Durchsuchen Sie die Kategorien unten.",
    el: "Διαδραστικός χάρτης σύντομα. Περιηγηθείτε ανά κατηγορία παρακάτω.",
  };

  const viewAll: Record<Locale, string> = {
    en: "View all",
    fr: "Voir tout",
    de: "Alle anzeigen",
    el: "Δείτε όλα",
  };

  return (
    <main className="min-h-screen bg-surface">
      {/* Hero section with static map image */}
      <div className="relative bg-aegean overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-aegean/80 to-aegean/95" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            {pageTitle[loc]}
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            {comingSoon[loc]}
          </p>

          {/* Category filter buttons */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {CATEGORIES.map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              const Icon = config.icon;
              return (
                <a
                  key={cat}
                  href={`#${cat}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors font-medium"
                >
                  <Icon className="w-4 h-4" />
                  {config.label[loc]}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category sections */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {CATEGORIES.map((cat) => {
          const config = CATEGORY_CONFIG[cat];
          const Icon = config.icon;
          const items = MAP_ITEMS.filter((item) => item.category === cat);

          return (
            <section key={cat} id={cat} className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-aegean/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-aegean" />
                  </div>
                  <h2 className="text-xl font-bold text-aegean">{config.label[loc]}</h2>
                </div>
                <Link
                  href={`/${locale}${config.path}`}
                  className="text-sm text-aegean font-medium hover:underline"
                >
                  {viewAll[loc]} &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/${locale}${config.path}/${item.slug}`}
                    className="group rounded-xl border border-border bg-white p-4 hover:border-aegean/30 hover:shadow-md transition-all"
                  >
                    <h3 className="font-semibold text-text group-hover:text-aegean transition-colors">
                      {item.name[loc]}
                    </h3>
                    <p className="text-sm text-text-muted mt-1 line-clamp-2">
                      {item.description[loc]}
                    </p>
                    <div className="flex items-center gap-1 mt-3 text-xs text-text-muted">
                      <MapPin className="w-3 h-3" />
                      <span>{item.lat.toFixed(2)}°N, {item.lng.toFixed(2)}°E</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
