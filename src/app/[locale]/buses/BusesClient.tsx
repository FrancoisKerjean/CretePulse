"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, ChevronDown, TriangleAlert } from "lucide-react";
import { CiBus } from "@/components/icons";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import type { BusRoute, BusDestination } from "@/lib/buses";
import type { BusAlert } from "@/lib/bus-alerts";
import { useParams } from "next/navigation";
import { BusNetworkMap } from "@/components/BusNetworkMap";
import { JourneyPlanner } from "./JourneyPlanner";
import { DepartureBoard } from "@/components/DepartureBoard";
import { RouteLine } from "@/components/RouteLine";
import { originPlaces } from "@/lib/bus-departures";
import { pairSlug } from "@/lib/bus-pairs";
import { PushBell } from "@/components/PushBell";

// ---------------------------------------------------------------------------
// Slugs valides des pages cibles (mirror des generateStaticParams cote serveur).
// On ne rend un lien sas QUE si la cible existe -> jamais de 404.
// ---------------------------------------------------------------------------
const THINGS_TO_DO_SLUGS = new Set([
  "heraklion", "chania", "rethymno", "agios-nikolaos", "sitia",
  "ierapetra", "malia", "hersonissos", "elounda", "makrigialos",
]);

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

const T = {
  title: {
    en: "KTEL Bus Timetables in Crete 2026",
    fr: "Horaires de Bus KTEL en Crète 2026",
    de: "KTEL Busfahrplan Kreta 2026",
    el: "Δρομολόγια ΚΤΕΛ Κρήτη 2026",
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
  viaStops: { en: "via", fr: "via", de: "über", el: "μέσω" },
  price: { en: "Price", fr: "Prix", de: "Preis", el: "Τιμή" },
  indicative: { en: "indicative", fr: "indicatif", de: "Richtwert", el: "ενδεικτική" },
  popularRoutes: {
    en: "Popular routes", fr: "Lignes populaires",
    de: "Beliebte Linien", el: "Δημοφιλείς γραμμές",
  },
  seeAllRoutes: {
    en: "See all routes", fr: "Voir toutes les lignes",
    de: "Alle Linien anzeigen", el: "Δείτε όλες τις γραμμές",
  },
  alertsTitle: {
    en: "Service alerts · KTEL East",
    fr: "Alertes service · KTEL Est",
    de: "Betriebsmeldungen · KTEL Ost",
    el: "Ειδοποιήσεις · ΚΤΕΛ Ανατολικής",
  },
  alertsSource: {
    en: "From KTEL Heraklion-Lasithi announcements. Click to read the official notice before travelling.",
    fr: "Annonces KTEL Héraklion-Lassithi. Cliquez pour lire l'avis officiel avant de partir.",
    de: "Meldungen von KTEL Heraklion-Lasithi. Vor der Fahrt die offizielle Mitteilung lesen.",
    el: "Ανακοινώσεις ΚΤΕΛ Ηρακλείου-Λασιθίου. Διαβάστε την επίσημη ανακοίνωση πριν ταξιδέψετε.",
  },
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
    en: "Departure times not available yet · check the operator site.",
    fr: "Horaires non encore disponibles · voir le site de l'opérateur.",
    de: "Abfahrtszeiten noch nicht verfügbar · Operator-Seite prüfen.",
    el: "Δεν υπάρχουν διαθέσιμες ώρες · δείτε τον φορέα.",
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
    en: "Times follow the operators' seasonal timetables and may change. Always confirm with the operator before travelling – summer (May–Oct) runs more frequently.",
    fr: "Les horaires suivent les calendriers saisonniers des opérateurs et peuvent changer. Vérifiez toujours auprès de l'opérateur avant de partir – l'été (mai–oct) est plus fréquent.",
    de: "Die Zeiten folgen den saisonalen Fahrplänen der Betreiber und können sich ändern. Bestätigen Sie sie immer beim Betreiber – im Sommer (Mai–Okt) häufiger.",
    el: "Οι ώρες ακολουθούν τα εποχικά δρομολόγια των φορέων και μπορεί να αλλάξουν. Επιβεβαιώνετε πάντα με τον μεταφορέα – το καλοκαίρι (Μάι–Οκτ) πιο συχνά.",
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

function NoDirectBusCard({ destination, locale }: { destination: BusDestination; locale: Locale }) {
  return (
    <div className="rounded-3xl border border-sun/50 bg-sand/50 overflow-hidden flex flex-col">
      <div className="px-5 py-4">
        <p className="font-bold text-base text-text">{destination.name}</p>
        <p className="text-xs text-amber-700 mt-1">
          {t("noDirectBus", locale)} {destination.name}.
        </p>
      </div>
      <div className="px-4 pb-4 pt-2 border-t border-amber-200/60 flex flex-wrap gap-x-3 gap-y-1 text-xs mt-auto">
        {destination.beaches_near && (
          <Link href={`/${locale}/beaches`} className="text-sea hover:underline">
            {t("beachesNear", locale)} {destination.name}
          </Link>
        )}
        {destination.things_to_do_slug && THINGS_TO_DO_SLUGS.has(destination.things_to_do_slug) && (
          <Link href={`/${locale}/things-to-do/${destination.things_to_do_slug}`} className="text-sea hover:underline">
            {t("whatToDo", locale)} {destination.name}
          </Link>
        )}
      </div>
    </div>
  );
}

// Bandeau d'alertes service (KTEL Est) : perturbations/itinéraires modifiés du
// jour, pour ne pas se fier à un horaire d'une ligne suspendue. Titres en
// anglais (libellé officiel KTEL) ; lien vers l'annonce officielle (détail
// souvent en pièce jointe PDF -> on renvoie à la source plutôt que d'inventer).
function BusAlertsBanner({ alerts, locale }: { alerts: BusAlert[]; locale: Locale }) {
  if (alerts.length === 0) return null;
  return (
    <div className="mb-6 rounded-[20px] border border-amber-300 bg-amber-50 px-5 py-4">
      <div className="flex items-center gap-2 mb-2.5">
        <TriangleAlert className="w-5 h-5 text-amber-700 shrink-0" />
        <p className="font-heading font-bold text-sm text-amber-900 m-0">{t("alertsTitle", locale)}</p>
      </div>
      <ul className="space-y-2 list-none p-0 m-0">
        {alerts.map((a) => (
          <li key={a.slug} className="text-sm leading-snug">
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-900 hover:underline font-semibold"
            >
              {a.published_date && (
                <span className="font-data text-xs text-amber-700 mr-1.5">
                  {new Date(a.published_date).toLocaleDateString(locale)}
                </span>
              )}
              {a.title}
            </a>
            {a.matched_routes && a.matched_routes.length > 0 && (
              <span className="text-xs text-amber-700"> · {a.matched_routes.join(" · ")}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-amber-700 mt-2.5 mb-0">{t("alertsSource", locale)}</p>
    </div>
  );
}

// Annuaire en lignes compactes (RouteLine) au lieu de grosses cartes. `hideAfter`
// masque visuellement au-dela de l'index (display:none) tout en gardant les
// horaires dans le HTML SSR -> aucune perte de maillage SEO.
function RouteList({
  list,
  locale,
  hideAfter,
}: {
  list: BusRoute[];
  locale: Locale;
  hideAfter?: number;
}) {
  return (
    <div className="rounded-2xl bg-white px-4 py-1 shadow-[0_2px_8px_rgba(11,94,120,.06)]">
      {list.map((route, i) => (
        <div
          key={route.id}
          className={hideAfter != null && i >= hideAfter ? "hidden" : "contents"}
        >
          <RouteLine route={route} locale={locale} />
        </div>
      ))}
    </div>
  );
}

function PopularRoutes({
  popular,
  locale,
  onPick,
}: {
  popular: { from: string; to: string }[];
  locale: Locale;
  onPick: (from: string, to: string) => void;
}) {
  if (popular.length === 0) return null;
  return (
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
        {t("popularRoutes", locale)}
      </p>
      <div className="flex flex-wrap gap-2">
        {popular.map((p) => (
          <button
            key={`${p.from}-${p.to}`}
            type="button"
            onClick={() => onPick(p.from, p.to)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-sm text-text hover:border-sea hover:text-sea transition-colors"
          >
            <span>{p.from}</span>
            <span className="text-text-muted" aria-hidden>·</span>
            <span>{p.to}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Section region repliable : aperçu de PREVIEW lignes, le reste demeure dans le
// DOM (SSR, maillage SEO préservé) mais masqué jusqu'au clic. Planner-first :
// le catalogue ne noie plus la page, on guide vers la recherche.
function CollapsibleRegion({
  title,
  list,
  locale,
}: {
  title: string;
  list: BusRoute[];
  locale: Locale;
}) {
  const PREVIEW = 8;
  const [open, setOpen] = useState(false);
  const canToggle = list.length > PREVIEW;
  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={() => canToggle && setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 mb-3 text-left"
        aria-expanded={open}
      >
        <h2 className="text-base font-semibold text-text">
          {title} <span className="text-text-muted font-normal">({list.length})</span>
        </h2>
        {canToggle && (
          <span className="inline-flex items-center gap-1.5 text-sm text-sea font-semibold shrink-0">
            {open ? t("showLess", locale) : t("seeAllRoutes", locale)}
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </span>
        )}
      </button>
      <RouteList
        list={list}
        locale={locale}
        hideAfter={open ? undefined : PREVIEW}
      />
      {canToggle && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 w-full rounded-2xl border border-border bg-surface py-2.5 text-sm font-semibold text-sea hover:bg-sky/40 transition-colors"
        >
          {t("seeAllRoutes", locale)} ({list.length})
        </button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main page (client component · needed for search state)
// ---------------------------------------------------------------------------

export function BusesClient({
  routes,
  destinations,
  updatedAt,
  alerts,
}: {
  routes: BusRoute[];
  destinations: Record<string, BusDestination>;
  updatedAt: string | null;
  alerts: BusAlert[];
}) {
  const params = useParams();
  const locale = (params?.locale as Locale) ?? "en";

  const [fromPlace, setFromPlace] = useState("");
  const [toPlace, setToPlace] = useState("");

  // Date partagee planner + board (chips Today/Tomorrow). isToday => countdown live.
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState<string>(todayStr);
  const isToday = date === todayStr;
  // Lieu du board : le From du planner s'il est choisi, sinon Heraklion (la geoloc
  // deja accordee est gere dans DepartureBoard, jamais de prompt non sollicite).
  const [boardPlace, setBoardPlace] = useState("Heraklion");
  useEffect(() => { if (fromPlace) setBoardPlace(fromPlace); }, [fromPlace]);

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

  // Lignes les plus desservies (pour les raccourcis "Lignes populaires").
  // Une seule entree par paire SEO digne, direction la mieux desservie.
  const popular = useMemo(() => {
    const best = new Map<string, { from: string; to: string; deps: number }>();
    for (const r of routes) {
      const ps = pairSlug(r.from_place, r.to_place);
      if (!ps) continue;
      const deps = r.departures?.length ?? 0;
      const prev = best.get(ps);
      if (!prev || deps > prev.deps) best.set(ps, { from: r.from_place, to: r.to_place, deps });
    }
    return [...best.values()].sort((a, b) => b.deps - a.deps).slice(0, 6);
  }, [routes]);

  const originList = useMemo(() => originPlaces(routes), [routes]);

  function pick(from: string, to: string) {
    setFromPlace(from);
    setToPlace(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Clic sur une station de la carte : devient le départ -> pilote le board.
  function selectStation(place: string) {
    setFromPlace(place);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header compact (le titre SEO complet reste dans <title>/meta/JSON-LD) */}
        <div className="mb-6">
          <h1 className="font-heading font-extrabold text-2xl md:text-3xl tracking-tight text-text flex items-center gap-2">
            <CiBus className="w-6 h-6 text-sea" /> {t("title", locale)}
          </h1>
          <p className="text-text-muted text-sm mt-1">{t("subtitle", locale)}</p>
          {updatedAt && (
            <p className="text-xs text-text-muted mt-0.5">
              {t("updatedOn", locale)} {new Date(updatedAt).toLocaleDateString(locale)}
            </p>
          )}
          {/* Opt-in push : alertes bus KTEL + infos urgentes (consentement explicite) */}
          <div className="mt-3">
            <PushBell locale={locale} />
          </div>
        </div>

        {/* Alertes service KTEL Est (perturbations/itinéraires modifiés du jour) */}
        <BusAlertsBanner alerts={alerts} locale={locale} />

        {/* Planificateur d'itineraire (combobox + chips date + swap) */}
        <JourneyPlanner
          routes={routes}
          locale={locale}
          fromPlace={fromPlace}
          toPlace={toPlace}
          onFromChange={setFromPlace}
          onToChange={setToPlace}
          date={date}
          onDateChange={setDate}
        />

        {/* Board "gare vivante" : prochains départs depuis le lieu actif */}
        <DepartureBoard
          routes={routes}
          locale={locale}
          activePlace={boardPlace}
          onPlaceChange={setBoardPlace}
          dateISO={date}
          isToday={isToday}
        />

        {/* Plan réseau interactif · réagit aux sélecteurs + stations cliquables */}
        <BusNetworkMap
          locale={locale}
          fromPlace={fromPlace}
          toPlace={toPlace}
          originPlaces={originList}
          onStationSelect={selectStation}
        />

        {/* Results (search) or grouped directory */}
        {hasSearch ? (
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-text mb-4">
              {filtered.length} route{filtered.length !== 1 ? "s" : ""}
            </h2>
            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-border bg-white p-6 text-center text-text-muted text-sm">
                {t("noRoute", locale)}
              </div>
            ) : (
              <RouteList list={filtered} locale={locale} />
            )}
          </div>
        ) : (
          <>
            <PopularRoutes popular={popular} locale={locale} onPick={pick} />
            {east.length > 0 && (
              <CollapsibleRegion title={t("regionEast", locale)} list={east} locale={locale} />
            )}
            {west.length > 0 && (
              <CollapsibleRegion title={t("regionWest", locale)} list={west} locale={locale} />
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
        <div className="mt-10 rounded-[20px] bg-sun/16 px-5 py-4 flex gap-3">
          <Info className="w-5 h-5 text-[#8A6A14] shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#8A6A14] m-0">{t("disclaimer", locale)}</p>
        </div>

      </div>
    </main>
  );
}
