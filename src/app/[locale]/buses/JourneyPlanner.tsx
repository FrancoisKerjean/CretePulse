"use client";

// Planificateur d'itineraire : depart -> arrivees atteignables -> date ->
// itineraire(s) + prix. Calcul 100 % local (moteur bus-journey, routes deja
// chargees par la page). Spec : docs/superpowers/specs/2026-06-10-bus-journey-planner-design.md
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Clock, Info, ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CiBus, CiCompass } from "@/components/icons";
import { KriKri } from "@/components/KriKri";
import type { Locale } from "@/lib/types";
import type { BusRoute } from "@/lib/buses";
import {
  buildGraph, reachableFrom, findJourneys, parseDurationMin,
  type Journey, type JourneyLeg,
} from "@/lib/bus-journey";
import { slugifyPlace, pairSlug } from "@/lib/bus-pairs";
import { SLUG_COORDS } from "@/lib/taxi-fare";
import { zoneForPickup } from "@/lib/car-partners";
import { CarPromo } from "@/components/car-rental/CarPromo";
import { nearestBy } from "@/lib/geo";
import { useGeoPosition } from "@/components/geo/useGeoPosition";
import { TaxiCompare } from "@/components/TaxiCompare";
import { NextDeparture } from "@/components/NextDeparture";
import partnersData from "@/data/taxi-partners.json";
import { PlaceCombobox } from "@/components/PlaceCombobox";

const TP = {
  searchTitle: {
    en: "Plan your journey", fr: "Préparez votre trajet",
    de: "Fahrt planen", el: "Σχεδιάστε τη διαδρομή σας",
  },
  from: { en: "From", fr: "Départ", de: "Von", el: "Από" },
  fromHere: { en: "From here", fr: "Partir d'ici", de: "Von hier", el: "Από εδώ" },
  geoUnavailable: {
    en: "Location unavailable", fr: "Localisation indisponible",
    de: "Standort nicht verfügbar", el: "Ο εντοπισμός δεν είναι διαθέσιμος",
  },
  to: { en: "To", fr: "Arrivée", de: "Nach", el: "Προς" },
  date: { en: "Date", fr: "Date", de: "Datum", el: "Ημερομηνία" },
  today: { en: "Today", fr: "Aujourd'hui", de: "Heute", el: "Σήμερα" },
  tomorrow: { en: "Tomorrow", fr: "Demain", de: "Morgen", el: "Αύριο" },
  swap: { en: "swap", fr: "inverser", de: "tauschen", el: "εναλλαγή" },
  whereTo: { en: "Where to?", fr: "Où allez-vous ?", de: "Wohin?", el: "Πού πηγαίνετε;" },
  locateMe: { en: "Locate me", fr: "Me localiser", de: "Standort", el: "Εντοπισμός" },
  seeJourney: { en: "See the route", fr: "Voir l'itinéraire", de: "Route anzeigen", el: "Δείτε τη διαδρομή" },
  pickDestination: {
    en: "Pick a destination above to see the route.",
    fr: "Choisissez une destination ci-dessus pour voir l'itinéraire.",
    de: "Wählen Sie oben ein Ziel, um die Route zu sehen.",
    el: "Επιλέξτε προορισμό πιο πάνω για να δείτε τη διαδρομή.",
  },
  allPlaces: { en: "All places", fr: "Tous les lieux", de: "Alle Orte", el: "Όλα τα μέρη" },
  yourJourney: {
    en: "Your journey", fr: "Votre itinéraire", de: "Ihre Verbindung", el: "Η διαδρομή σας",
  },
  via: { en: "Change at", fr: "Correspondance à", de: "Umstieg in", el: "Αλλαγή στο" },
  departuresThatDay: {
    en: "Departures on that day", fr: "Départs ce jour-là",
    de: "Abfahrten an diesem Tag", el: "Αναχωρήσεις εκείνη την ημέρα",
  },
  total: { en: "Total", fr: "Total", de: "Gesamt", el: "Σύνολο" },
  indicative: { en: "indicative", fr: "indicatif", de: "Richtwert", el: "ενδεικτική" },
  direct: { en: "Direct", fr: "Direct", de: "Direkt", el: "Απευθείας" },
  oneChange: { en: "1 change", fr: "1 correspondance", de: "1 Umstieg", el: "1 αλλαγή" },
  changes: { en: "changes", fr: "correspondances", de: "Umstiege", el: "αλλαγές" },
  seeDetail: { en: "See detail", fr: "Voir le détail", de: "Detail anzeigen", el: "Λεπτομέρειες" },
  hideDetail: { en: "Hide detail", fr: "Masquer le détail", de: "Detail ausblenden", el: "Απόκρυψη" },
  buyTicket: { en: "Buy a ticket", fr: "Acheter un ticket", de: "Ticket kaufen", el: "Αγορά εισιτηρίου" },
  atTicketOffice: {
    en: "+ fare at the ticket office for one leg",
    fr: "+ tarif au guichet pour un tronçon",
    de: "+ Fahrpreis am Schalter für einen Abschnitt",
    el: "+ εισιτήριο στο εκδοτήριο για ένα σκέλος",
  },
  connectionNotGuaranteed: {
    en: "Unofficial connection: KTEL does not guarantee transfers, allow extra time.",
    fr: "Correspondance non officielle : le KTEL ne la garantit pas, prévoyez de la marge.",
    de: "Inoffizieller Anschluss: KTEL garantiert keine Umstiege, planen Sie Puffer ein.",
    el: "Ανεπίσημη ανταπόκριση: το ΚΤΕΛ δεν την εγγυάται, αφήστε περιθώριο.",
  },
  noServiceThatDay: {
    en: "No departure on that date – try another day.",
    fr: "Pas de départ à cette date – essayez un autre jour.",
    de: "Keine Abfahrt an diesem Datum – anderen Tag versuchen.",
    el: "Καμία αναχώρηση εκείνη την ημερομηνία – δοκιμάστε άλλη μέρα.",
  },
  noRoute: {
    en: "No route found (direct or with one change). Try reversing origin and destination.",
    fr: "Aucun trajet trouvé (direct ou avec une correspondance). Essayez d'inverser départ et arrivée.",
    de: "Keine Verbindung gefunden (direkt oder mit Umstieg). Start und Ziel tauschen.",
    el: "Δεν βρέθηκε διαδρομή (άμεση ή με ανταπόκριση). Αντιστρέψτε αφετηρία και προορισμό.",
  },
  westPartial: {
    en: "West Crete data is partial for now – see KTEL Chania-Rethymno for full schedules.",
    fr: "Les données Crète ouest sont partielles pour l'instant – voir KTEL La Canée-Rethymnon.",
    de: "Westkreta-Daten sind derzeit unvollständig – siehe KTEL Chania-Rethymno.",
    el: "Τα δεδομένα δυτικής Κρήτης είναι ελλιπή προς το παρόν – δείτε ΚΤΕΛ Χανίων-Ρεθύμνου.",
  },
  priceMethodo: {
    en: "Prices marked “indicative” are estimated from distance; others come from operators or published fares.",
    fr: "Les prix « indicatifs » sont estimés à partir de la distance ; les autres viennent des opérateurs ou de grilles publiées.",
    de: "Mit „Richtwert“ markierte Preise sind aus der Entfernung geschätzt; andere stammen von Betreibern oder veröffentlichten Tarifen.",
    el: "Οι «ενδεικτικές» τιμές εκτιμώνται από την απόσταση· οι υπόλοιπες προέρχονται από τους φορείς ή δημοσιευμένους τιμοκαταλόγους.",
  },
  alightAt: {
    en: "get off at", fr: "descendre à", de: "Ausstieg in", el: "κατεβείτε στο",
  },
  lineLabel: {
    en: "line", fr: "ligne", de: "Linie", el: "γραμμή",
  },
  stopTimeUnknown: {
    en: "Times shown are departures from the origin – KTEL does not publish the stop time at intermediate stops.",
    fr: "Les horaires affichés sont les départs du terminus – KTEL ne publie pas l'heure de passage aux arrêts intermédiaires.",
    de: "Angezeigte Zeiten sind Abfahrten am Ausgangsort – KTEL veröffentlicht keine Durchfahrtszeiten an Zwischenhalten.",
    el: "Οι ώρες είναι αναχωρήσεις από την αφετηρία – η ΚΤΕΛ δεν δημοσιεύει ώρες διέλευσης στις ενδιάμεσες στάσεις.",
  },
} as const satisfies Record<string, Record<Locale, string>>;

function tp(key: keyof typeof TP, locale: Locale): string {
  return TP[key][locale] ?? TP[key].en;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function maxDateISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString().slice(0, 10);
}

function LegRow({ leg, locale }: { leg: JourneyLeg; locale: Locale }) {
  // Descente a un arret intermediaire : duree/prix de la route entiere non
  // applicables au tronçon partiel -> on ne les affiche pas (no-invention).
  const alight = leg.alightAt != null;
  const dur = alight ? null : parseDurationMin(leg.route.duration);
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap text-sm font-semibold text-text">
        <CiBus className="w-4 h-4 text-aegean shrink-0" />
        <span>{leg.route.from_place}</span>
        <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
        <span>{leg.alightAt ?? leg.route.to_place}</span>
        {alight && (
          <span className="text-[11px] font-normal text-text-muted bg-surface border border-border rounded-full px-2 py-0.5">
            {tp("lineLabel", locale)} {leg.route.from_place} – {leg.route.to_place} · {tp("alightAt", locale)} {leg.alightAt}
          </span>
        )}
        {dur != null && (
          <span className="text-xs font-normal text-text-muted inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {leg.route.duration_estimated ? `≈ ${leg.route.duration} (${tp("indicative", locale)})` : leg.route.duration}
          </span>
        )}
        {!alight && leg.route.price_eur != null && (
          <span className="text-xs font-normal text-text-muted">
            {leg.route.price_eur.toFixed(2)} €
            {leg.route.price_estimated ? ` (${tp("indicative", locale)})` : ""}
          </span>
        )}
        <NextDeparture route={leg.route} locale={locale} />
      </div>
      {alight && (
        <p className="text-[11px] text-text-muted mt-1 mb-0">{tp("stopTimeUnknown", locale)}</p>
      )}
      <p className="text-[11px] uppercase tracking-wide text-text-muted mt-2 mb-1">
        {tp("departuresThatDay", locale)}
      </p>
      <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0 font-data">
        {leg.times.map((time, i) => (
          <li
            key={`${time}-${i}`}
            className="px-2.5 py-1 rounded-[10px] bg-surface border-[1.5px] border-lagoon/35 text-xs font-semibold text-text"
          >
            {time}
          </li>
        ))}
      </ul>
    </div>
  );
}

function JourneyCard({ journey, locale }: { journey: Journey; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const legs = journey.legs;
  const from = legs[0].route.from_place;
  const last = legs[legs.length - 1];
  const to = last.alightAt ?? last.route.to_place;
  const changes = legs.slice(0, -1).map((l) => l.alightAt ?? l.route.to_place);
  const nChanges = changes.length;
  // Durée affichée seulement pour un trajet DIRECT : aux correspondances les
  // temps d'attente ne sont pas publiés -> total non fiable (no-invention).
  const directDur = legs.length === 1 && legs[0].alightAt == null ? legs[0].route.duration : null;
  const routing =
    nChanges === 0 ? tp("direct", locale)
    : nChanges === 1 ? tp("oneChange", locale)
    : `${nChanges} ${tp("changes", locale)}`;

  function onBuy() {
    const plausible = (window as unknown as {
      plausible?: (e: string, o?: { props?: Record<string, string | number> }) => void;
    }).plausible;
    plausible?.("ticket_intent", {
      props: { from: slugifyPlace(from) || from.toLowerCase(), to: slugifyPlace(to) || to.toLowerCase() },
    });
  }

  return (
    <div className="rounded-3xl bg-white overflow-hidden shadow-[0_12px_30px_rgba(11,94,120,.12)]">
      {/* Synthèse (cliquable -> détail) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left bg-night text-white px-5 py-3.5 flex items-center justify-between gap-3"
      >
        <span className="min-w-0">
          <span className="block font-bold text-sm">
            {routing}
            {changes.length > 0 ? ` · ${tp("via", locale)} ${changes.join(", ")}` : ""}
          </span>
          <span className="block text-xs text-sky/85 mt-0.5">
            {from} · {to}{directDur ? ` · ${directDur}` : ""}
          </span>
        </span>
        <span className="text-right shrink-0">
          {journey.priceTotal != null && (
            <span className="block font-heading font-extrabold text-lg leading-none">
              {journey.priceTotal.toFixed(2)} €
              {journey.priceEstimated && (
                <span className="text-[10px] font-normal align-top ml-0.5">{tp("indicative", locale)}</span>
              )}
            </span>
          )}
          <span className="text-[11px] text-sky/85 inline-flex items-center gap-0.5 mt-1">
            {open ? tp("hideDetail", locale) : tp("seeDetail", locale)}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </span>
        </span>
      </button>

      {/* Détail (replié par défaut) */}
      {open && (
        <>
          <div className="divide-y divide-border">
            {legs.map((leg) => (
              <LegRow key={leg.route.id} leg={leg} locale={locale} />
            ))}
          </div>
          {(journey.priceIncomplete || legs.length > 1) && (
            <div className="px-4 py-2 border-t border-border bg-amber-50 text-xs text-amber-800 space-y-0.5">
              {legs.length > 1 && <p>{tp("connectionNotGuaranteed", locale)}</p>}
              {journey.priceIncomplete && <p>{tp("atTicketOffice", locale)}</p>}
            </div>
          )}
        </>
      )}

      {/* CTA fake-door : mesure de l'intention d'achat (billetterie pas encore dispo) */}
      <Link
        href={`/buses/tickets?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}
        onClick={onBuy}
        className="block text-center bg-sun text-night font-bold text-sm py-3 hover:brightness-95 transition"
      >
        {tp("buyTicket", locale)}
      </Link>
    </div>
  );
}

export function JourneyPlanner({
  routes,
  locale,
  fromPlace,
  toPlace,
  onFromChange,
  onToChange,
  date,
  onDateChange,
}: {
  routes: BusRoute[];
  locale: Locale;
  fromPlace: string;
  toPlace: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  date: string;
  onDateChange: (v: string) => void;
}) {

  const graph = useMemo(() => buildGraph(routes), [routes]);
  const allPlaces = useMemo(
    () => Array.from(new Set(routes.flatMap((r) => [r.from_place, r.to_place]))).sort(),
    [routes],
  );

  // "Partir d'ici" : géoloc 100 % client → lieu le plus proche parmi les
  // options du graphe qui ont des coords (nom DB → slug BUS_PLACE_SLUGS →
  // SLUG_COORDS). Appliqué UNIQUEMENT après un clic explicite (wantFromHere),
  // jamais au mount : une init ?from= existante n'est pas écrasée.
  const geo = useGeoPosition();
  const [wantFromHere, setWantFromHere] = useState(false);
  const [searched, setSearched] = useState(false);
  const geoBlocked = geo.status === "denied" || geo.status === "unavailable";

  const placesWithCoords = useMemo(() => {
    const out: Array<{ name: string; lat: number; lon: number }> = [];
    for (const name of allPlaces) {
      const slug = slugifyPlace(name);
      const c = slug ? SLUG_COORDS[slug] : undefined;
      if (c) out.push({ name, lat: c[0], lon: c[1] });
    }
    return out;
  }, [allPlaces]);

  useEffect(() => {
    if (!wantFromHere || !geo.pos) return;
    const nearest = nearestBy(placesWithCoords, (p) => [p.lat, p.lon], geo.pos, 1)[0];
    setWantFromHere(false);
    if (nearest) onFromChange(nearest.name);
  }, [wantFromHere, geo.pos, placesWithCoords, onFromChange]);

  // "Où allez-vous ?" facon SNCF : si la geoloc est DEJA accordee/connue
  // (cd-geo en sessionStorage, partage avec le reste du site), on pre-remplit le
  // Depart au chargement -> l'utilisateur n'a plus qu'a taper l'arrivee. Jamais
  // de prompt non sollicite ; une seule fois ; n'ecrase pas un ?from= ni un choix.
  const autoFilledFrom = useRef(false);
  useEffect(() => {
    if (autoFilledFrom.current || fromPlace || !geo.pos) return;
    if (geo.status !== "granted" && geo.status !== "manual") return;
    const nearest = nearestBy(placesWithCoords, (p) => [p.lat, p.lon], geo.pos, 1)[0];
    if (nearest) { autoFilledFrom.current = true; onFromChange(nearest.name); }
  }, [geo.status, geo.pos, fromPlace, placesWithCoords, onFromChange]);

  // Defaut "fait le travail a la place de l'utilisateur" : sans geoloc accordee
  // ni ?from=, on pre-remplit Heraklion (hub central) pour qu'une recherche
  // aboutisse toujours. 400ms laissent la geoloc (sessionStorage) remplir d'abord.
  const defaultedFrom = useRef(false);
  useEffect(() => {
    if (defaultedFrom.current) return;
    const t = setTimeout(() => {
      defaultedFrom.current = true;
      if (!fromPlace) onFromChange("Heraklion");
    }, 400);
    return () => clearTimeout(t);
  }, [fromPlace, onFromChange]);

  function handleFromHere() {
    setWantFromHere(true);
    if (!geo.pos) geo.requestGeo();
  }

  // Bouton "Voir l'itineraire" : action explicite. Garantit un Depart (Heraklion
  // par defaut) et revele les resultats.
  function handleSearch() {
    if (!fromPlace) onFromChange("Heraklion");
    setSearched(true);
  }
  const reachable = useMemo(
    () => (fromPlace ? reachableFrom(graph, fromPlace) : null),
    [graph, fromPlace],
  );
  const toOptions = reachable ?? allPlaces;
  const journeys = fromPlace && toPlace ? findJourneys(graph, fromPlace, toPlace, date) : [];

  // depart choisi mais arrivee devenue inatteignable -> reset
  useEffect(() => {
    if (toPlace && reachable && !reachable.includes(toPlace)) onToChange("");
  }, [toPlace, reachable, onToChange]);

  // Instrumentation `bus_search` (signal #1 du site, spec docs/instrumentation) :
  // quel trajet on cherche. Emis APRES un clic "Voir l'itineraire" (searched),
  // puis suit les changements de date/arrivee. results=0 = trou de couverture.
  const journeyCount = journeys.length;
  useEffect(() => {
    if (!searched || !fromPlace || !toPlace) return;
    const id = setTimeout(() => {
      const dateChoice = date === todayISO() ? "today" : date === tomorrowISO() ? "tomorrow" : date;
      const plausible = (window as unknown as {
        plausible?: (e: string, o?: { props?: Record<string, string | number> }) => void;
      }).plausible;
      plausible?.("bus_search", {
        props: {
          from: slugifyPlace(fromPlace) || fromPlace.toLowerCase(),
          to: slugifyPlace(toPlace) || toPlace.toLowerCase(),
          date: dateChoice,
          results: journeyCount,
        },
      });
    }, 400);
    return () => clearTimeout(id);
  }, [searched, fromPlace, toPlace, date, journeyCount]);

  const westOnly = useMemo(() => {
    const east = new Set(
      routes.filter((r) => r.operator_id === "herlas").flatMap((r) => [r.from_place, r.to_place]),
    );
    return (p: string) => Boolean(p) && !east.has(p);
  }, [routes]);

  const noJourney = Boolean(fromPlace && toPlace) && journeys.length === 0;
  const noServiceThatDay = noJourney && reachable !== null && reachable.includes(toPlace);
  const westNotice = noJourney && (westOnly(fromPlace) || westOnly(toPlace));

  const taxiSlugA = fromPlace ? slugifyPlace(fromPlace) : null;
  const taxiSlugB = toPlace ? slugifyPlace(toPlace) : null;
  const taxiPair = fromPlace && toPlace ? pairSlug(fromPlace, toPlace) : null;

  // Pas d'itinéraire bus -> encart location de voiture, pickup contextuel :
  // le départ s'il appartient à une zone car-partners, sinon l'arrivée.
  const carPickup =
    (taxiSlugA && zoneForPickup(taxiSlugA) ? taxiSlugA : null) ??
    (taxiSlugB && zoneForPickup(taxiSlugB) ? taxiSlugB : null) ??
    undefined;

  return (
    <div className="rounded-[28px] bg-white p-6 mb-6 shadow-[0_12px_32px_rgba(11,94,120,.10)]">
      <p className="font-heading font-bold text-base text-text mb-3.5">{tp("searchTitle", locale)}</p>
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Arrivée d'abord (destination-first, esprit "où allez-vous ?") */}
        <PlaceCombobox
          value={toPlace}
          onChange={onToChange}
          options={toOptions}
          placeholder={tp("whereTo", locale)}
          ariaLabel={tp("to", locale)}
        />

        {/* Départ : pré-rempli depuis la géoloc si déjà accordée, + compas */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <PlaceCombobox
            value={fromPlace}
            onChange={onFromChange}
            options={allPlaces}
            placeholder={`${tp("from", locale)} · ${tp("allPlaces", locale)}`}
            ariaLabel={tp("from", locale)}
          />
          <button
            type="button"
            onClick={handleFromHere}
            aria-label={tp("locateMe", locale)}
            title={geoBlocked ? tp("geoUnavailable", locale) : tp("locateMe", locale)}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-2.5 text-xs font-semibold transition-colors ${
              geoBlocked
                ? "text-text-light cursor-help"
                : "text-aegean hover:bg-surface"
            }`}
          >
            {wantFromHere && geo.status === "prompting" ? (
              <span className="block w-[16px] h-[16px] rounded-full border-2 border-aegean border-t-transparent animate-spin" aria-hidden />
            ) : (
              <CiCompass className="w-[16px] h-[16px]" />
            )}
            <span>{tp("locateMe", locale)}</span>
          </button>
        </div>

        <div className="flex gap-1.5 items-center flex-wrap">
          {[
            { v: todayISO(), label: tp("today", locale) },
            { v: tomorrowISO(), label: tp("tomorrow", locale) },
          ].map((c) => (
            <button key={c.v} type="button" onClick={() => onDateChange(c.v)}
              className={`rounded-full px-3 py-2 text-sm font-semibold border-[1.5px] ${
                date === c.v ? "bg-night text-white border-night" : "bg-white text-text border-border"}`}>
              {c.label}
            </button>
          ))}
          <input
            type="date"
            value={date}
            min={todayISO()}
            max={maxDateISO()}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            aria-label={tp("date", locale)}
            className="border border-border rounded-full px-3 py-2 text-sm text-text bg-white font-data focus:outline-none focus:ring-2 focus:ring-lagoon/40"
          />
        </div>

        <button type="button" onClick={() => { onFromChange(toPlace); onToChange(fromPlace); }}
          className="text-xs font-semibold text-lagoon-deep border-[1.5px] border-lagoon rounded-full px-3 py-2 shrink-0">
          {tp("swap", locale)}
        </button>
        {(fromPlace || toPlace) && (
          <button type="button" onClick={() => { onFromChange(""); onToChange(""); setSearched(false); }}
            className="text-xs text-text-muted hover:text-text underline shrink-0 px-1">
            {locale === "fr" ? "Effacer" : "Clear"}
          </button>
        )}
      </div>

      {/* Action explicite "Voir l'itineraire" (clarte du flow) */}
      <button
        type="button"
        onClick={handleSearch}
        className="mt-4 w-full rounded-full bg-night text-white py-3 text-sm font-bold hover:bg-night/90 transition-colors"
      >
        {tp("seeJourney", locale)}
      </button>

      {searched && fromPlace && !toPlace && (
        <p className="mt-3 text-sm text-text-muted text-center">{tp("pickDestination", locale)}</p>
      )}

      {searched && journeys.length > 0 && (
        <div className="mt-4 space-y-3">
          {journeys.map((j, i) => (
            <JourneyCard key={`${j.hub ?? "direct"}-${i}`} journey={j} locale={locale} />
          ))}
          <p className="text-xs text-text-muted flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {tp("priceMethodo", locale)}
          </p>
        </div>
      )}

      {searched && noJourney && (
        <>
          <div className="mt-4 rounded-3xl border border-border bg-surface p-4 text-sm text-text-muted flex items-center gap-4">
            <KriKri mood="empty" className="w-20 h-16 shrink-0" />
            <div className="space-y-1">
              <p>{noServiceThatDay ? tp("noServiceThatDay", locale) : tp("noRoute", locale)}</p>
              {westNotice && <p>{tp("westPartial", locale)}</p>}
            </div>
          </div>
          <CarPromo locale={locale} pickup={carPickup} source="journey-planner" />
        </>
      )}

      {searched && taxiSlugA && taxiSlugB && taxiPair && (
        <TaxiCompare
          locale={locale}
          slugA={taxiSlugA}
          slugB={taxiSlugB}
          pairSlug={taxiPair}
          busPriceEur={journeys[0]?.priceTotal ?? null}
          partnersData={partnersData}
          compact
        />
      )}
    </div>
  );
}
