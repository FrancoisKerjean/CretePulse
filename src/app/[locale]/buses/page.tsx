"use client";

import { useState } from "react";
import { Bus, Clock, Euro, ArrowRight, ExternalLink, Info } from "lucide-react";
import type { Locale } from "@/lib/types";
import { useParams } from "next/navigation";

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

interface BusRoute {
  id: string;
  from: string;
  to: string;
  duration: string;
  frequency: string;
  price: number | null;
  schedule?: string;
  notes?: Record<Locale, string>;
}

const ROUTES: BusRoute[] = [
  {
    id: "hea-cha",
    from: "Heraklion",
    to: "Chania",
    duration: "2h30",
    frequency: "Every hour",
    price: 15.10,
    schedule: "05:30 – 21:00",
  },
  {
    id: "hea-ret",
    from: "Heraklion",
    to: "Rethymno",
    duration: "1h30",
    frequency: "Every hour",
    price: 8.50,
  },
  {
    id: "hea-ano",
    from: "Heraklion",
    to: "Agios Nikolaos",
    duration: "1h30",
    frequency: "Every hour",
    price: 8.30,
    schedule: "06:30 – 21:00",
  },
  {
    id: "hea-ier",
    from: "Heraklion",
    to: "Ierapetra",
    duration: "2h30",
    frequency: "5–6 daily",
    price: 12.80,
  },
  {
    id: "hea-sit",
    from: "Heraklion",
    to: "Sitia",
    duration: "3h30",
    frequency: "4–5 daily",
    price: 16.30,
  },
  {
    id: "hea-mal",
    from: "Heraklion",
    to: "Malia",
    duration: "45 min",
    frequency: "Frequent",
    price: null,
  },
  {
    id: "hea-her",
    from: "Heraklion",
    to: "Hersonissos",
    duration: "30 min",
    frequency: "Frequent",
    price: null,
  },
  {
    id: "cha-ret",
    from: "Chania",
    to: "Rethymno",
    duration: "1h",
    frequency: "Frequent",
    price: 6.80,
  },
  {
    id: "ano-ier",
    from: "Agios Nikolaos",
    to: "Ierapetra",
    duration: "1h",
    frequency: "5–6 daily",
    price: null,
  },
  {
    id: "ano-sit",
    from: "Agios Nikolaos",
    to: "Sitia",
    duration: "1h30",
    frequency: "4–5 daily",
    price: null,
  },
];

const CITIES = [
  "Heraklion",
  "Chania",
  "Rethymno",
  "Agios Nikolaos",
  "Ierapetra",
  "Sitia",
  "Malia",
  "Hersonissos",
];

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

const T = {
  title: {
    en: "KTEL Bus Schedules – Crete",
    fr: "Horaires KTEL – Crète",
    de: "KTEL Busfahrpläne – Kreta",
    el: "Δρομολόγια ΚΤΕΛ – Κρήτη",
  },
  subtitle: {
    en: "Public bus schedules across the island. Prices and times for the main routes.",
    fr: "Horaires des bus publics à travers l'île. Prix et horaires pour les principales lignes.",
    de: "Öffentliche Busfahrpläne auf der Insel. Preise und Zeiten für die Hauptstrecken.",
    el: "Δρομολόγια δημόσιων λεωφορείων σε όλο το νησί. Τιμές και ώρες για τις κύριες γραμμές.",
  },
  searchTitle: {
    en: "Find a route",
    fr: "Trouver un trajet",
    de: "Verbindung suchen",
    el: "Εύρεση διαδρομής",
  },
  from: {
    en: "From",
    fr: "Départ",
    de: "Von",
    el: "Από",
  },
  to: {
    en: "To",
    fr: "Arrivée",
    de: "Nach",
    el: "Προς",
  },
  allCities: {
    en: "All cities",
    fr: "Toutes les villes",
    de: "Alle Städte",
    el: "Όλες οι πόλεις",
  },
  noRoute: {
    en: "No direct route found. Try reversing origin and destination.",
    fr: "Aucun trajet direct trouvé. Essayez d'inverser le départ et l'arrivée.",
    de: "Keine direkte Verbindung gefunden. Tausche Start und Ziel.",
    el: "Δεν βρέθηκε άμεση διαδρομή. Δοκιμάστε να αντιστρέψετε αφετηρία και προορισμό.",
  },
  allRoutes: {
    en: "All routes",
    fr: "Toutes les lignes",
    de: "Alle Linien",
    el: "Όλες οι γραμμές",
  },
  duration: {
    en: "Duration",
    fr: "Durée",
    de: "Dauer",
    el: "Διάρκεια",
  },
  frequency: {
    en: "Frequency",
    fr: "Fréquence",
    de: "Häufigkeit",
    el: "Συχνότητα",
  },
  price: {
    en: "Price",
    fr: "Prix",
    de: "Preis",
    el: "Τιμή",
  },
  schedule: {
    en: "Schedule",
    fr: "Horaires",
    de: "Fahrplan",
    el: "Πρόγραμμα",
  },
  disclaimer: {
    en: "Schedules are approximate. Check e-ktel.com for current times. Summer schedules (May–Oct) have more frequent service.",
    fr: "Les horaires sont approximatifs. Consultez e-ktel.com pour les horaires en vigueur. Les horaires d'été (mai–oct) sont plus fréquents.",
    de: "Fahrzeiten sind Näherungswerte. Aktuelle Zeiten auf e-ktel.com prüfen. Sommerfahrplan (Mai–Okt) bietet häufigere Verbindungen.",
    el: "Τα δρομολόγια είναι κατά προσέγγιση. Ελέγξτε το e-ktel.com για τρέχοντες χρόνους. Το καλοκαιρινό πρόγραμμα (Μάι–Οκτ) έχει συχνότερα δρομολόγια.",
  },
  officialSite: {
    en: "Official KTEL website",
    fr: "Site officiel KTEL",
    de: "Offizielle KTEL-Website",
    el: "Επίσημη ιστοσελίδα ΚΤΕΛ",
  },
  priceNA: {
    en: "Check site",
    fr: "Voir site",
    de: "Seite prüfen",
    el: "Ελέγξτε",
  },
} as const satisfies Record<string, Record<Locale, string>>;

function t(key: keyof typeof T, locale: Locale): string {
  return T[key][locale];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RouteCard({ route, locale }: { route: BusRoute; locale: Locale }) {
  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden hover:shadow-md transition-shadow">
      {/* Card header */}
      <div className="bg-aegean px-5 py-4 text-white">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-lg">{route.from}</span>
          <ArrowRight className="w-4 h-4 text-white/70 shrink-0" />
          <span className="font-bold text-lg">{route.to}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-aegean shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-text-muted">{t("duration", locale)}</p>
            <p className="text-sm font-semibold text-text">{route.duration}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Bus className="w-4 h-4 text-aegean shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-text-muted">{t("frequency", locale)}</p>
            <p className="text-sm font-semibold text-text">{route.frequency}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Euro className="w-4 h-4 text-aegean shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-text-muted">{t("price", locale)}</p>
            <p className="text-sm font-semibold text-text">
              {route.price != null
                ? `${route.price.toFixed(2)} €`
                : t("priceNA", locale)}
            </p>
          </div>
        </div>

        {route.schedule && (
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-sand shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-text-muted">{t("schedule", locale)}</p>
              <p className="text-sm font-semibold text-text">{route.schedule}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page (client component — needed for search state)
// ---------------------------------------------------------------------------

export default function BusesPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) ?? "en";

  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");

  const filtered = ROUTES.filter((r) => {
    const matchFrom = !fromCity || r.from === fromCity || r.to === fromCity;
    const matchTo = !toCity || r.to === toCity || r.from === toCity;
    // If both are set, require exact match (either direction)
    if (fromCity && toCity) {
      return (
        (r.from === fromCity && r.to === toCity) ||
        (r.from === toCity && r.to === fromCity)
      );
    }
    return matchFrom && matchTo;
  });

  const hasSearch = fromCity || toCity;

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-aegean/10 shrink-0">
            <Bus className="w-7 h-7 text-aegean" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-aegean">{t("title", locale)}</h1>
            <p className="text-text-muted mt-1">{t("subtitle", locale)}</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="rounded-xl border border-border bg-white p-5 mb-8 shadow-sm">
          <p className="text-sm font-semibold text-text mb-3">{t("searchTitle", locale)}</p>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <select
              value={fromCity}
              onChange={(e) => setFromCity(e.target.value)}
              className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-text bg-white focus:outline-none focus:ring-2 focus:ring-aegean/30"
            >
              <option value="">{t("from", locale)} – {t("allCities", locale)}</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <ArrowRight className="w-5 h-5 text-text-muted shrink-0 hidden sm:block" />

            <select
              value={toCity}
              onChange={(e) => setToCity(e.target.value)}
              className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-text bg-white focus:outline-none focus:ring-2 focus:ring-aegean/30"
            >
              <option value="">{t("to", locale)} – {t("allCities", locale)}</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {hasSearch && (
              <button
                onClick={() => { setFromCity(""); setToCity(""); }}
                className="text-xs text-text-muted hover:text-text underline shrink-0 px-1"
              >
                ✕ Reset
              </button>
            )}
          </div>
        </div>

        {/* Results / all routes */}
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-text mb-4">
            {hasSearch ? `${filtered.length} route${filtered.length !== 1 ? "s" : ""}` : t("allRoutes", locale)}
          </h2>

          {hasSearch && filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-white p-6 text-center text-text-muted text-sm">
              {t("noRoute", locale)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(hasSearch ? filtered : ROUTES).map((route) => (
                <RouteCard key={route.id} route={route} locale={locale} />
              ))}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{t("disclaimer", locale)}</p>
        </div>

        {/* Official link */}
        <div className="mt-6 text-center">
          <a
            href="https://e-ktel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-aegean font-medium hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            {t("officialSite", locale)}
          </a>
        </div>
      </div>
    </main>
  );
}
