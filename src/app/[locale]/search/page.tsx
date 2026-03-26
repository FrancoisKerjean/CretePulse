"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";

interface SearchEntry {
  title: Record<string, string>;
  path: string;
  tags: string[];
}

const SEARCH_INDEX: SearchEntry[] = [
  {
    title: { en: "Beaches in Crete", fr: "Plages en Crète", de: "Strände auf Kreta", el: "Παραλίες στην Κρήτη" },
    path: "/beaches",
    tags: ["beach", "sand", "sea", "swim", "plage", "mer", "strand", "παραλία"],
  },
  {
    title: { en: "Weather in Crete", fr: "Météo en Crète", de: "Wetter auf Kreta", el: "Καιρός στην Κρήτη" },
    path: "/weather",
    tags: ["weather", "temperature", "rain", "sun", "météo", "wetter", "καιρός"],
  },
  {
    title: { en: "Villages in Crete", fr: "Villages en Crète", de: "Dörfer auf Kreta", el: "Χωριά στην Κρήτη" },
    path: "/villages",
    tags: ["village", "town", "traditional", "χωριό", "dorf"],
  },
  {
    title: { en: "Events in Crete", fr: "Événements en Crète", de: "Events auf Kreta", el: "Εκδηλώσεις στην Κρήτη" },
    path: "/events",
    tags: ["event", "festival", "concert", "événement", "εκδήλωση"],
  },
  {
    title: { en: "Cretan Food Guide", fr: "Guide Culinaire Crétois", de: "Kretischer Essensguide", el: "Οδηγός Κρητικής Κουζίνας" },
    path: "/food",
    tags: ["food", "restaurant", "taverna", "eat", "cuisine", "essen", "φαγητό"],
  },
  {
    title: { en: "Hiking in Crete", fr: "Randonnées en Crète", de: "Wandern auf Kreta", el: "Πεζοπορία στην Κρήτη" },
    path: "/hikes",
    tags: ["hike", "hiking", "gorge", "trail", "walk", "randonnée", "wandern", "πεζοπορία"],
  },
  {
    title: { en: "Bus Routes in Crete", fr: "Lignes de Bus en Crète", de: "Busverbindungen auf Kreta", el: "Λεωφορεία στην Κρήτη" },
    path: "/buses",
    tags: ["bus", "transport", "ktel", "route", "λεωφορείο"],
  },
  {
    title: { en: "Map of Crete", fr: "Carte de la Crète", de: "Karte von Kreta", el: "Χάρτης Κρήτης" },
    path: "/map",
    tags: ["map", "carte", "karte", "χάρτης", "location"],
  },
  {
    title: { en: "FAQ About Crete", fr: "FAQ sur la Crète", de: "FAQ über Kreta", el: "Συχνές Ερωτήσεις Κρήτη" },
    path: "/faq",
    tags: ["faq", "question", "help", "info", "guide"],
  },
  {
    title: { en: "Where to Stay in Crete", fr: "Où Dormir en Crète", de: "Übernachten auf Kreta", el: "Πού να Μείνετε στην Κρήτη" },
    path: "/where-to-stay",
    tags: ["hotel", "airbnb", "stay", "accommodation", "hébergement", "unterkunft", "διαμονή"],
  },
  {
    title: { en: "Fire Alerts in Crete", fr: "Alertes Incendies en Crète", de: "Feueralarme auf Kreta", el: "Ειδοποιήσεις Πυρκαγιάς Κρήτη" },
    path: "/fire-alerts",
    tags: ["fire", "alert", "safety", "incendie", "feuer", "πυρκαγιά"],
  },
  {
    title: { en: "News from Crete", fr: "Actualités de Crète", de: "Nachrichten aus Kreta", el: "Νέα από την Κρήτη" },
    path: "/news",
    tags: ["news", "actualité", "nachrichten", "νέα"],
  },
  {
    title: { en: "About Crete Direct", fr: "À Propos de Crete Direct", de: "Über Crete Direct", el: "Σχετικά με Crete Direct" },
    path: "/about",
    tags: ["about", "contact", "info"],
  },
  {
    title: { en: "Submit an Event", fr: "Proposer un Événement", de: "Event Einreichen", el: "Υποβολή Εκδήλωσης" },
    path: "/submit-event",
    tags: ["submit", "event", "add", "proposer", "einreichen"],
  },
  {
    title: { en: "Articles About Crete", fr: "Articles sur la Crète", de: "Artikel über Kreta", el: "Άρθρα για την Κρήτη" },
    path: "/articles",
    tags: ["article", "blog", "read", "guide"],
  },
  {
    title: { en: "Newsletter", fr: "Newsletter", de: "Newsletter", el: "Newsletter" },
    path: "/newsletter",
    tags: ["newsletter", "email", "subscribe"],
  },
  // Things to do in cities
  {
    title: { en: "Things to Do in Heraklion", fr: "Que Faire à Héraklion", de: "Aktivitäten in Heraklion", el: "Τι να Κάνετε στο Ηράκλειο" },
    path: "/things-to-do/heraklion",
    tags: ["heraklion", "héraklion", "ηράκλειο", "things", "activités"],
  },
  {
    title: { en: "Things to Do in Chania", fr: "Que Faire à La Canée", de: "Aktivitäten in Chania", el: "Τι να Κάνετε στα Χανιά" },
    path: "/things-to-do/chania",
    tags: ["chania", "canée", "χανιά", "things", "activités"],
  },
  {
    title: { en: "Things to Do in Rethymno", fr: "Que Faire à Réthymno", de: "Aktivitäten in Rethymno", el: "Τι να Κάνετε στο Ρέθυμνο" },
    path: "/things-to-do/rethymno",
    tags: ["rethymno", "réthymno", "ρέθυμνο", "things", "activités"],
  },
  {
    title: { en: "Things to Do in Agios Nikolaos", fr: "Que Faire à Agios Nikolaos", de: "Aktivitäten in Agios Nikolaos", el: "Τι να Κάνετε στον Άγιο Νικόλαο" },
    path: "/things-to-do/agios-nikolaos",
    tags: ["agios", "nikolaos", "άγιος", "νικόλαος", "things"],
  },
  // Monthly visit guides
  {
    title: { en: "Crete in January", fr: "La Crète en Janvier", de: "Kreta im Januar", el: "Κρήτη τον Ιανουάριο" },
    path: "/visit/january",
    tags: ["january", "janvier", "januar", "ιανουάριος", "winter"],
  },
  {
    title: { en: "Crete in April", fr: "La Crète en Avril", de: "Kreta im April", el: "Κρήτη τον Απρίλιο" },
    path: "/visit/april",
    tags: ["april", "avril", "απρίλιος", "spring"],
  },
  {
    title: { en: "Crete in June", fr: "La Crète en Juin", de: "Kreta im Juni", el: "Κρήτη τον Ιούνιο" },
    path: "/visit/june",
    tags: ["june", "juin", "juni", "ιούνιος", "summer"],
  },
  {
    title: { en: "Crete in August", fr: "La Crète en Août", de: "Kreta im August", el: "Κρήτη τον Αύγουστο" },
    path: "/visit/august",
    tags: ["august", "août", "αύγουστος", "summer"],
  },
  {
    title: { en: "Crete in October", fr: "La Crète en Octobre", de: "Kreta im Oktober", el: "Κρήτη τον Οκτώβριο" },
    path: "/visit/october",
    tags: ["october", "octobre", "oktober", "οκτώβριος", "autumn"],
  },
  // Compare pages
  {
    title: { en: "Elafonissi vs Balos", fr: "Elafonissi vs Balos", de: "Elafonissi vs Balos", el: "Ελαφονήσι vs Μπάλος" },
    path: "/compare/elafonissi-vs-balos",
    tags: ["compare", "elafonissi", "balos", "beach", "pink sand"],
  },
  {
    title: { en: "Heraklion vs Chania", fr: "Héraklion vs La Canée", de: "Heraklion vs Chania", el: "Ηράκλειο vs Χανιά" },
    path: "/compare/heraklion-vs-chania",
    tags: ["compare", "heraklion", "chania", "city"],
  },
  {
    title: { en: "Samaria vs Imbros Gorge", fr: "Gorges Samaria vs Imbros", de: "Samaria vs Imbros Schlucht", el: "Σαμαριά vs Ίμβρος" },
    path: "/compare/samaria-vs-imbros",
    tags: ["compare", "samaria", "imbros", "gorge", "hike"],
  },
  // Transport routes
  {
    title: { en: "Athens to Crete Ferry", fr: "Ferry Athènes-Crète", de: "Fähre Athen-Kreta", el: "Πλοίο Αθήνα-Κρήτη" },
    path: "/getting-around/athens-crete-ferry",
    tags: ["ferry", "athens", "boat", "piraeus", "athènes", "πειραιάς"],
  },
  {
    title: { en: "Heraklion Airport Transfer", fr: "Transfert Aéroport Héraklion", de: "Flughafentransfer Heraklion", el: "Μεταφορά Αεροδρόμιο Ηρακλείου" },
    path: "/getting-around/heraklion-airport",
    tags: ["airport", "transfer", "heraklion", "taxi", "aéroport", "flughafen"],
  },
  // Property management
  {
    title: { en: "Property Management in Crete", fr: "Gestion Locative en Crète", de: "Hausverwaltung auf Kreta", el: "Διαχείριση Ακινήτων στην Κρήτη" },
    path: "/property-management",
    tags: ["property", "management", "rental", "airbnb", "gestion", "ακίνητα"],
  },
];

const LABELS: Record<string, { placeholder: string; noResults: string; resultsCount: string; title: string }> = {
  en: {
    title: "Search Crete Direct",
    placeholder: "Search beaches, villages, food, hikes...",
    noResults: "No results found. Try different keywords.",
    resultsCount: "results",
  },
  fr: {
    title: "Rechercher sur Crete Direct",
    placeholder: "Rechercher plages, villages, cuisine, randonnées...",
    noResults: "Aucun résultat. Essayez d'autres mots-clés.",
    resultsCount: "résultats",
  },
  de: {
    title: "Crete Direct durchsuchen",
    placeholder: "Strände, Dörfer, Essen, Wanderungen suchen...",
    noResults: "Keine Ergebnisse. Versuchen Sie andere Suchbegriffe.",
    resultsCount: "Ergebnisse",
  },
  el: {
    title: "Αναζήτηση στο Crete Direct",
    placeholder: "Αναζήτηση παραλιών, χωριών, φαγητού, πεζοπορίας...",
    noResults: "Δεν βρέθηκαν αποτελέσματα. Δοκιμάστε άλλες λέξεις-κλειδιά.",
    resultsCount: "αποτελέσματα",
  },
};

export default function SearchPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const labels = LABELS[locale] || LABELS.en;

  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const terms = q.split(/\s+/);
    return SEARCH_INDEX.filter((entry) => {
      const title = (entry.title[locale] || entry.title.en).toLowerCase();
      const tagStr = entry.tags.join(" ");
      return terms.every(
        (term) => title.includes(term) || tagStr.includes(term) || entry.path.includes(term)
      );
    });
  }, [query, locale]);

  const showResults = query.trim().length >= 2;

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-aegean mb-6">
          {labels.title}
        </h1>

        {/* Search input */}
        <div className="relative mb-8">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.placeholder}
            autoFocus
            className="w-full pl-12 pr-4 py-4 text-lg rounded-xl border border-border bg-white focus:border-aegean focus:ring-2 focus:ring-aegean/20 outline-none transition-all"
          />
        </div>

        {/* Results */}
        {showResults && (
          <div>
            <p className="text-sm text-text-muted mb-4">
              {results.length} {labels.resultsCount}
            </p>

            {results.length === 0 ? (
              <p className="text-text-muted py-8 text-center">
                {labels.noResults}
              </p>
            ) : (
              <div className="space-y-2">
                {results.map((entry) => (
                  <Link
                    key={entry.path}
                    href={`/${locale}${entry.path}`}
                    className="block rounded-xl border border-border bg-white px-5 py-4 hover:border-aegean/30 hover:shadow-md transition-all"
                  >
                    <span className="font-semibold text-text hover:text-aegean transition-colors">
                      {entry.title[locale] || entry.title.en}
                    </span>
                    <span className="block text-sm text-text-muted mt-0.5">
                      crete.direct/{locale}{entry.path}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Show all pages when no search query */}
        {!showResults && (
          <div className="space-y-2">
            {SEARCH_INDEX.map((entry) => (
              <Link
                key={entry.path}
                href={`/${locale}${entry.path}`}
                className="block rounded-xl border border-border bg-white px-5 py-4 hover:border-aegean/30 hover:shadow-md transition-all"
              >
                <span className="font-semibold text-text hover:text-aegean transition-colors">
                  {entry.title[locale] || entry.title.en}
                </span>
                <span className="block text-sm text-text-muted mt-0.5">
                  crete.direct/{locale}{entry.path}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
