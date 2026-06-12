"use client";

// Planificateur d'itineraire : depart -> arrivees atteignables -> date ->
// itineraire(s) + prix. Calcul 100 % local (moteur bus-journey, routes deja
// chargees par la page). Spec : docs/superpowers/specs/2026-06-10-bus-journey-planner-design.md
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock, Euro, Info } from "lucide-react";
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
  atTicketOffice: {
    en: "+ fare at the ticket office for one leg",
    fr: "+ tarif au guichet pour un tronçon",
    de: "+ Fahrpreis am Schalter für einen Abschnitt",
    el: "+ εισιτήριο στο εκδοτήριο για ένα σκέλος",
  },
  connectionNotGuaranteed: {
    en: "Leg durations unknown – allow time for the connection, it is not guaranteed.",
    fr: "Durées inconnues – prévoyez de la marge, la correspondance n'est pas garantie.",
    de: "Fahrzeiten unbekannt – Puffer einplanen, der Anschluss ist nicht garantiert.",
    el: "Άγνωστη διάρκεια – αφήστε περιθώριο, η ανταπόκριση δεν είναι εγγυημένη.",
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
            <Clock className="w-3 h-3" /> {leg.route.duration}
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
  return (
    <div className="rounded-3xl bg-white overflow-hidden shadow-[0_12px_30px_rgba(11,94,120,.12)]">
      <div className="bg-night px-5 py-3 text-white flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-bold">
          {tp("yourJourney", locale)}
          {journey.hub ? ` · ${tp("via", locale)} ${journey.hub}` : ""}
        </span>
        {journey.priceTotal != null && (
          <span className="text-sm font-bold inline-flex items-center gap-1">
            <Euro className="w-4 h-4" />
            {tp("total", locale)} {journey.priceTotal.toFixed(2)} €
            {journey.priceEstimated && (
              <span className="text-[11px] font-normal bg-white/20 rounded px-1.5 py-0.5">
                {tp("indicative", locale)}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="divide-y divide-border">
        {journey.legs.map((leg) => (
          <LegRow key={leg.route.id} leg={leg} locale={locale} />
        ))}
      </div>
      {(journey.priceIncomplete || (journey.legs.length > 1 && !journey.durationKnown)) && (
        <div className="px-4 py-2 border-t border-border bg-amber-50 text-xs text-amber-800 space-y-0.5">
          {journey.priceIncomplete && <p>{tp("atTicketOffice", locale)}</p>}
          {journey.legs.length > 1 && !journey.durationKnown && (
            <p>{tp("connectionNotGuaranteed", locale)}</p>
          )}
        </div>
      )}
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
}: {
  routes: BusRoute[];
  locale: Locale;
  fromPlace: string;
  toPlace: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  const [date, setDate] = useState(todayISO);

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

  function handleFromHere() {
    setWantFromHere(true);
    if (!geo.pos) geo.requestGeo();
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
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <select
            value={fromPlace}
            onChange={(e) => onFromChange(e.target.value)}
            className="flex-1 min-w-0 border border-border rounded-full px-4 py-2.5 text-sm text-text bg-white focus:outline-none focus:ring-2 focus:ring-lagoon/40"
          >
            <option value="">{tp("from", locale)} · {tp("allPlaces", locale)}</option>
            {allPlaces.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleFromHere}
            aria-label={tp("fromHere", locale)}
            title={geoBlocked ? tp("geoUnavailable", locale) : tp("fromHere", locale)}
            className={`shrink-0 p-2.5 rounded-full border border-border bg-white transition-colors ${
              geoBlocked
                ? "text-text-light cursor-help"
                : "text-aegean hover:bg-surface"
            }`}
          >
            {wantFromHere && geo.status === "prompting" ? (
              <span className="block w-[18px] h-[18px] rounded-full border-2 border-aegean border-t-transparent animate-spin" aria-hidden />
            ) : (
              <CiCompass className="w-[18px] h-[18px]" />
            )}
          </button>
        </div>

        <ArrowRight className="w-5 h-5 text-text-muted shrink-0 hidden sm:block" />

        <select
          value={toPlace}
          onChange={(e) => onToChange(e.target.value)}
          className="flex-1 border border-border rounded-full px-4 py-2.5 text-sm text-text bg-white focus:outline-none focus:ring-2 focus:ring-lagoon/40"
        >
          <option value="">{tp("to", locale)} · {tp("allPlaces", locale)}</option>
          {toOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          min={todayISO()}
          max={maxDateISO()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          aria-label={tp("date", locale)}
          className="border border-border rounded-full px-4 py-2.5 text-sm text-text bg-white font-data focus:outline-none focus:ring-2 focus:ring-lagoon/40"
        />

        {(fromPlace || toPlace) && (
          <button
            onClick={() => { onFromChange(""); onToChange(""); }}
            className="text-xs text-text-muted hover:text-text underline shrink-0 px-1"
          >
            ✕ Reset
          </button>
        )}
      </div>

      {journeys.length > 0 && (
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

      {noJourney && (
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

      {taxiSlugA && taxiSlugB && taxiPair && (
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
