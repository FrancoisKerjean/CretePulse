"use client";

import { useEffect, useState } from "react";
import { Clock, Euro, ArrowRight, Info } from "lucide-react";
import { CiBus } from "@/components/icons";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import type { BusRoute, BusDestination, BusDepartureGroup } from "@/lib/buses";
import { useParams } from "next/navigation";
import { BusNetworkMap } from "@/components/BusNetworkMap";
import { JourneyPlanner } from "./JourneyPlanner";
import { pairSlug } from "@/lib/bus-pairs";

// ---------------------------------------------------------------------------
// Slugs valides des pages cibles (mirror des generateStaticParams cote serveur).
// On ne rend un lien sas QUE si la cible existe -> jamais de 404.
// ---------------------------------------------------------------------------
const THINGS_TO_DO_SLUGS = new Set([
  "heraklion", "chania", "rethymno", "agios-nikolaos", "sitia",
  "ierapetra", "malia", "hersonissos", "elounda", "makrigialos",
]);
const WHERE_TO_STAY_SLUGS = new Set([
  "chania", "heraklion", "rethymno", "agios-nikolaos",
  "elounda", "plakias", "paleochora", "matala",
]);
const GETTING_AROUND_SLUGS = new Set([
  "heraklion-to-chania", "heraklion-to-rethymno",
  "heraklion-to-agios-nikolaos", "heraklion-to-sitia",
]);

function slugifyRoute(from: string, to: string): string {
  const s = (x: string) => x.toLowerCase().trim().replace(/\s+/g, "-");
  return `${s(from)}-to-${s(to)}`;
}

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
    en: "Every KTEL bus route across Crete – towns, beaches, villages and sites – kept up to date from the operators.",
    fr: "Toutes les lignes de bus KTEL de Crète – villes, plages, villages et sites – tenues à jour depuis les opérateurs.",
    de: "Alle KTEL-Buslinien auf Kreta – Städte, Strände, Dörfer und Sehenswürdigkeiten – aktuell von den Betreibern.",
    el: "Όλες οι γραμμές ΚΤΕΛ της Κρήτης – πόλεις, παραλίες, χωριά και αξιοθέατα – ενημερωμένες από τους φορείς.",
  },
  updatedOn: {
    en: "Updated on", fr: "Mis à jour le", de: "Aktualisiert am", el: "Ενημερώθηκε στις",
  },
  searchTitle: {
    en: "Find a route", fr: "Trouver un trajet", de: "Verbindung suchen", el: "Εύρεση διαδρομής",
  },
  from: { en: "From", fr: "Départ", de: "Von", el: "Από" },
  to: { en: "To", fr: "Arrivée", de: "Nach", el: "Προς" },
  allPlaces: {
    en: "All places", fr: "Tous les lieux", de: "Alle Orte", el: "Όλα τα μέρη",
  },
  noRoute: {
    en: "No direct route found. Try reversing origin and destination.",
    fr: "Aucun trajet direct trouvé. Essayez d'inverser le départ et l'arrivée.",
    de: "Keine direkte Verbindung gefunden. Tausche Start und Ziel.",
    el: "Δεν βρέθηκε άμεση διαδρομή. Δοκιμάστε να αντιστρέψετε αφετηρία και προορισμό.",
  },
  regionEast: {
    en: "East Crete (KTEL Heraklion-Lasithi)",
    fr: "Crète orientale (KTEL Héraklion-Lassithi)",
    de: "Ostkreta (KTEL Heraklion-Lasithi)",
    el: "Ανατολική Κρήτη (ΚΤΕΛ Ηρακλείου-Λασιθίου)",
  },
  regionWest: {
    en: "West Crete (KTEL Chania-Rethymno)",
    fr: "Crète occidentale (KTEL La Canée-Rethymnon)",
    de: "Westkreta (KTEL Chania-Rethymno)",
    el: "Δυτική Κρήτη (ΚΤΕΛ Χανίων-Ρεθύμνου)",
  },
  frequency: { en: "Frequency", fr: "Fréquence", de: "Häufigkeit", el: "Συχνότητα" },
  price: { en: "Price", fr: "Prix", de: "Preis", el: "Τιμή" },
  departures: { en: "Departures", fr: "Départs", de: "Abfahrten", el: "Αναχωρήσεις" },
  perDay: { en: "/ day", fr: "/ jour", de: "/ Tag", el: "/ ημέρα" },
  allDepartures: {
    en: "All departure times",
    fr: "Tous les horaires de départ",
    de: "Alle Abfahrtszeiten",
    el: "Όλες οι ώρες αναχώρησης",
  },
  showLess: { en: "Show less", fr: "Réduire", de: "Weniger anzeigen", el: "Λιγότερα" },
  showAll: { en: "Show all", fr: "Tout afficher", de: "Alle anzeigen", el: "Όλα" },
  noTimetableYet: {
    en: "Departure times not available yet — check the operator site.",
    fr: "Horaires non encore disponibles — voir le site de l'opérateur.",
    de: "Abfahrtszeiten noch nicht verfügbar — Operator-Seite prüfen.",
    el: "Δεν υπάρχουν διαθέσιμες ώρες — δείτε τον φορέα.",
  },
  officialSchedule: {
    en: "Official schedule",
    fr: "Horaires officiels",
    de: "Offizieller Fahrplan",
    el: "Επίσημο πρόγραμμα",
  },
  whatToDo: { en: "What to do in", fr: "Que faire à", de: "Aktivitäten in", el: "Τι να κάνετε στο" },
  whereToStay: { en: "Where to stay", fr: "Où dormir", de: "Unterkünfte", el: "Πού να μείνετε" },
  beachesNear: { en: "Beaches near", fr: "Plages près de", de: "Strände bei", el: "Παραλίες κοντά στο" },
  noDirectBus: {
    en: "No direct bus to", fr: "Pas de bus direct vers",
    de: "Kein Direktbus nach", el: "Χωρίς απευθείας λεωφορείο προς",
  },
  noDirectSection: {
    en: "No direct bus – plan ahead",
    fr: "Sans bus direct – à anticiper",
    de: "Kein Direktbus – im Voraus planen",
    el: "Χωρίς απευθείας λεωφορείο – προγραμματίστε",
  },
  compareModes: {
    en: "Compare car, taxi, ferry", fr: "Comparer voiture, taxi, ferry",
    de: "Auto, Taxi, Fähre vergleichen", el: "Σύγκριση αυτοκινήτου, ταξί, πλοίου",
  },
  disclaimer: {
    en: "Times follow the operators' seasonal timetables and may change. Always confirm on the official KTEL sites before travelling – summer (May–Oct) runs more frequently.",
    fr: "Les horaires suivent les calendriers saisonniers des opérateurs et peuvent changer. Vérifiez toujours sur les sites officiels KTEL avant de partir – l'été (mai–oct) est plus fréquent.",
    de: "Die Zeiten folgen den saisonalen Fahrplänen der Betreiber und können sich ändern. Bestätigen Sie sie immer auf den offiziellen KTEL-Seiten – im Sommer (Mai–Okt) häufiger.",
    el: "Οι ώρες ακολουθούν τα εποχικά δρομολόγια των φορέων και μπορεί να αλλάξουν. Επιβεβαιώνετε πάντα στις επίσημες σελίδες ΚΤΕΛ – το καλοκαίρι (Μάι–Οκτ) πιο συχνά.",
  },
  officialEast: { en: "KTEL East (Heraklion-Lasithi)", fr: "KTEL Est (Héraklion-Lassithi)", de: "KTEL Ost", el: "ΚΤΕΛ Ανατολικής" },
  officialWest: { en: "KTEL West (Chania-Rethymno)", fr: "KTEL Ouest (La Canée-Rethymnon)", de: "KTEL West", el: "ΚΤΕΛ Δυτικής" },
} as const satisfies Record<string, Record<Locale, string>>;

function t(key: keyof typeof T, locale: Locale): string {
  return T[key][locale] ?? T[key].en;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GuideLinks({ route, destination, locale }: { route: BusRoute; destination?: BusDestination; locale: Locale }) {
  const routeSlug = slugifyRoute(route.from_place, route.to_place);
  const showCompare = GETTING_AROUND_SLUGS.has(routeSlug);
  const ttd = destination?.things_to_do_slug && THINGS_TO_DO_SLUGS.has(destination.things_to_do_slug)
    ? destination.things_to_do_slug : null;
  const wts = destination?.where_to_stay_slug && WHERE_TO_STAY_SLUGS.has(destination.where_to_stay_slug)
    ? destination.where_to_stay_slug : null;
  const beaches = destination?.beaches_near;

  if (!destination && !showCompare) return null;

  return (
    <div className="px-4 pb-4 pt-3 border-t border-border space-y-2">
      {destination && destination.has_direct_bus === false && (
        <p className="text-xs text-amber-700">
          {t("noDirectBus", locale)} {destination.name}.
        </p>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {ttd && (
          <Link href={`/${locale}/things-to-do/${ttd}`} className="text-aegean hover:underline">
            {t("whatToDo", locale)} {destination!.name}
          </Link>
        )}
        {wts && (
          <Link href={`/${locale}/where-to-stay/${wts}`} className="text-aegean hover:underline">
            {t("whereToStay", locale)}
          </Link>
        )}
        {beaches && (
          <Link href={`/${locale}/beaches`} className="text-aegean hover:underline">
            {t("beachesNear", locale)} {destination!.name}
          </Link>
        )}
      </div>
      {showCompare && (
        <Link
          href={`/${locale}/getting-around/${routeSlug}`}
          className="inline-block text-xs text-text-muted hover:text-text underline"
        >
          {t("compareModes", locale)}
        </Link>
      )}
    </div>
  );
}

function NoDirectBusCard({ destination, locale }: { destination: BusDestination; locale: Locale }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden flex flex-col">
      <div className="px-5 py-4">
        <p className="font-bold text-base text-text">{destination.name}</p>
        <p className="text-xs text-amber-700 mt-1">
          {t("noDirectBus", locale)} {destination.name}.
        </p>
      </div>
      <div className="px-4 pb-4 pt-2 border-t border-amber-200/60 flex flex-wrap gap-x-3 gap-y-1 text-xs mt-auto">
        {destination.beaches_near && (
          <Link href={`/${locale}/beaches`} className="text-aegean hover:underline">
            {t("beachesNear", locale)} {destination.name}
          </Link>
        )}
        {destination.things_to_do_slug && THINGS_TO_DO_SLUGS.has(destination.things_to_do_slug) && (
          <Link href={`/${locale}/things-to-do/${destination.things_to_do_slug}`} className="text-aegean hover:underline">
            {t("whatToDo", locale)} {destination.name}
          </Link>
        )}
      </div>
    </div>
  );
}

function RouteCard({ route, destination, locale }: { route: BusRoute; destination?: BusDestination; locale: Locale }) {
  const deps = route.departures ?? [];
  const range = deps.length > 0 ? `${deps[0]} – ${deps[deps.length - 1]}` : null;
  const COLLAPSED_LIMIT = 8;

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {(() => {
        // Maillage SEO : le header linke la page paire quand elle existe.
        const ps = pairSlug(route.from_place, route.to_place);
        const header = (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base">{route.from_place}</span>
            <ArrowRight className="w-4 h-4 text-white/70 shrink-0" />
            <span className="font-bold text-base">{route.to_place}</span>
          </div>
        );
        return ps ? (
          <Link href={`/${locale}/buses/${ps}`} className="block bg-aegean px-5 py-4 text-white hover:bg-aegean/90">
            {header}
          </Link>
        ) : (
          <div className="bg-aegean px-5 py-4 text-white">{header}</div>
        );
      })()}

      <div className="p-4 grid grid-cols-2 gap-4">
        {route.frequency && (
          <div className="flex items-start gap-2">
            <CiBus className="w-4 h-4 text-aegean shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-text-muted">{t("frequency", locale)}</p>
              <p className="text-sm font-semibold text-text">{route.frequency}</p>
            </div>
          </div>
        )}

        {range && (
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-aegean shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-text-muted">{t("departures", locale)}</p>
              <p className="text-sm font-semibold text-text">{range}</p>
              {deps.length > 1 && (
                <p className="text-xs text-text-muted">{deps.length} {t("perDay", locale)}</p>
              )}
            </div>
          </div>
        )}

        {route.price_eur != null && (
          <div className="flex items-start gap-2">
            <Euro className="w-4 h-4 text-aegean shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-text-muted">{t("price", locale)}</p>
              <p className="text-sm font-semibold text-text">{route.price_eur.toFixed(2)} €</p>
            </div>
          </div>
        )}
      </div>

      {deps.length > 0 && (
        <DepartureChips
          groups={route.departures_by_day ?? null}
          times={deps}
          collapsedLimit={COLLAPSED_LIMIT}
          locale={locale}
        />
      )}

      <div className="mt-auto">
        <GuideLinks route={route} destination={destination} locale={locale} />
      </div>
    </div>
  );
}

// Liste détaillée des horaires de départ : SEO + utilité = on rend tout
// dans le HTML (pas de <details> qui masque côté Google), avec un toggle
// client pour le confort visuel quand il y a beaucoup de départs.
// Si `departures_by_day` est fourni, on rend une sous-liste par grille
// (Mon-Fri / Sat / Sun, etc.) pour eviter que l'utilisateur confonde des
// horaires de jours differents.
function DepartureChips({
  groups,
  times,
  collapsedLimit,
  locale,
}: {
  groups: BusDepartureGroup[] | null;
  times: string[];
  collapsedLimit: number;
  locale: Locale;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = times.length;
  const shouldCollapse = total > collapsedLimit && !expanded;

  return (
    <div className="px-4 pb-4 pt-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
        {t("allDepartures", locale)}
      </p>

      {groups && groups.length > 0 ? (
        <DepartureGroups
          groups={groups}
          collapsed={shouldCollapse}
          collapsedLimit={collapsedLimit}
        />
      ) : (
        <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
          {(shouldCollapse ? times.slice(0, collapsedLimit) : times).map((time, i) => (
            <li
              key={`${time}-${i}`}
              className="px-2 py-0.5 rounded bg-aegean/5 border border-aegean/15 text-xs font-mono text-text"
            >
              {time}
            </li>
          ))}
        </ul>
      )}

      {total > collapsedLimit && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs text-aegean font-semibold hover:underline"
        >
          {expanded ? t("showLess", locale) : `${t("showAll", locale)} (${total})`}
        </button>
      )}
    </div>
  );
}

function DepartureGroups({
  groups,
  collapsed,
  collapsedLimit,
}: {
  groups: BusDepartureGroup[];
  collapsed: boolean;
  collapsedLimit: number;
}) {
  // En mode collapsed, on rend une fenetre des `collapsedLimit` premiers horaires
  // groupes par jour, en gardant la structure (pas un slice flat brut).
  let remaining = collapsed ? collapsedLimit : Infinity;
  return (
    <div className="space-y-2">
      {groups.map((g, gi) => {
        if (remaining <= 0) return null;
        const visible = g.times.slice(0, remaining);
        remaining -= visible.length;
        if (visible.length === 0) return null;
        return (
          <div key={`${g.days}-${gi}`}>
            <p className="text-[11px] uppercase tracking-wide text-text-muted mb-1">
              {g.days}
            </p>
            <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
              {visible.map((time, i) => (
                <li
                  key={`${time}-${i}`}
                  className="px-2 py-0.5 rounded bg-aegean/5 border border-aegean/15 text-xs font-mono text-text"
                >
                  {time}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page (client component — needed for search state)
// ---------------------------------------------------------------------------

export function BusesClient({
  routes,
  destinations,
  updatedAt,
}: {
  routes: BusRoute[];
  destinations: Record<string, BusDestination>;
  updatedAt: string | null;
}) {
  const params = useParams();
  const locale = (params?.locale as Locale) ?? "en";

  const [fromPlace, setFromPlace] = useState("");
  const [toPlace, setToPlace] = useState("");

  // Permet aux pages paires (et au partage) de preremplir le planificateur :
  // /buses?from=Heraklion&to=Ierapetra. window.location plutot que
  // useSearchParams pour ne pas imposer de Suspense boundary au prerender.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const f = p.get("from");
    const t = p.get("to");
    // Sync depuis l'URL apres hydratation : un lazy initializer creerait un
    // mismatch SSR (le HTML serveur est rendu sans query params).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (f) setFromPlace(f);
    if (t) setToPlace(t);
  }, []);

  const filtered = routes.filter((r) => {
    if (fromPlace && toPlace) {
      return (
        (r.from_place === fromPlace && r.to_place === toPlace) ||
        (r.from_place === toPlace && r.to_place === fromPlace)
      );
    }
    const matchFrom = !fromPlace || r.from_place === fromPlace || r.to_place === fromPlace;
    const matchTo = !toPlace || r.to_place === toPlace || r.from_place === toPlace;
    return matchFrom && matchTo;
  });

  const hasSearch = Boolean(fromPlace || toPlace);
  const east = routes.filter((r) => r.operator_id === "herlas");
  const west = routes.filter((r) => r.operator_id === "ektel");
  const noBusDests = Object.values(destinations).filter((d) => d.has_direct_bus === false);

  const dest = (slug: string | null) => (slug ? destinations[slug] : undefined);

  function Grid({ list }: { list: BusRoute[] }) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((route) => (
          <RouteCard key={route.id} route={route} destination={dest(route.to_slug)} locale={locale} />
        ))}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-aegean/10 shrink-0">
            <CiBus className="w-7 h-7 text-aegean" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-aegean">{t("title", locale)}</h1>
            <p className="text-text-muted mt-1">{t("subtitle", locale)}</p>
            {updatedAt && (
              <p className="text-xs text-text-muted mt-1">
                {t("updatedOn", locale)} {new Date(updatedAt).toLocaleDateString(locale)}
              </p>
            )}
          </div>
        </div>

        {/* Planificateur d'itineraire AVANT la carte → la map réagit aux sélecteurs */}
        <JourneyPlanner
          routes={routes}
          locale={locale}
          fromPlace={fromPlace}
          toPlace={toPlace}
          onFromChange={setFromPlace}
          onToChange={setToPlace}
        />

        {/* Plan réseau interactif — réagit aux sélecteurs From/To */}
        <BusNetworkMap locale={locale} fromPlace={fromPlace} toPlace={toPlace} />

        {/* Results (search) or grouped directory */}
        {hasSearch ? (
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-text mb-4">
              {filtered.length} route{filtered.length !== 1 ? "s" : ""}
            </h2>
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-border bg-white p-6 text-center text-text-muted text-sm">
                {t("noRoute", locale)}
              </div>
            ) : (
              <Grid list={filtered} />
            )}
          </div>
        ) : (
          <>
            {east.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-text mb-4">
                  {t("regionEast", locale)} <span className="text-text-muted font-normal">({east.length})</span>
                </h2>
                <Grid list={east} />
              </section>
            )}
            {west.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-text mb-4">
                  {t("regionWest", locale)} <span className="text-text-muted font-normal">({west.length})</span>
                </h2>
                <Grid list={west} />
              </section>
            )}
            {noBusDests.length > 0 && (
              <section className="mb-2">
                <h2 className="text-lg font-semibold text-text mb-4">{t("noDirectSection", locale)}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {noBusDests.map((d) => (
                    <NoDirectBusCard key={d.slug} destination={d} locale={locale} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Disclaimer */}
        <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{t("disclaimer", locale)}</p>
        </div>

      </div>
    </main>
  );
}
