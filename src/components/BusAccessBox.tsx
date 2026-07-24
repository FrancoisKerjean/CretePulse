// BusAccessBox - bloc "Comment y aller en bus" inséré sur les pages destinations.
// Internal linking massif vers /buses (levier SEO #1 26/05/2026, audit GSC).
// Server component : fetch Supabase bus_destinations + bus_routes par slug source.

import { Bus, ArrowRight, Clock, Euro, Repeat } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { BusRoute, BusDestination } from "@/lib/buses";

type Loc = "en" | "fr" | "de" | "el";

const L: Record<
  Loc,
  {
    heading: string;
    directBus: string;
    fromCity: string;
    duration: string;
    price: string;
    frequency: string;
    noDirectBus: (place: string) => string;
    noDirectBusHint: string;
    seeAllBuses: string;
    seeAllBusesShort: string;
  }
> = {
  en: {
    heading: "Getting there by bus",
    directBus: "Direct KTEL bus",
    fromCity: "from",
    duration: "Duration",
    price: "Price",
    frequency: "Frequency",
    noDirectBus: (p) => `No direct bus to ${p}`,
    noDirectBusHint:
      "Rent a car, take a taxi, or change buses at the nearest KTEL-served town.",
    seeAllBuses: "See all KTEL bus routes in Crete",
    seeAllBusesShort: "See all bus routes",
  },
  fr: {
    heading: "Comment y aller en bus",
    directBus: "Bus KTEL direct",
    fromCity: "depuis",
    duration: "Durée",
    price: "Prix",
    frequency: "Fréquence",
    noDirectBus: (p) => `Pas de bus direct vers ${p}`,
    noDirectBusHint:
      "Louez une voiture, prenez un taxi, ou changez de bus dans la ville KTEL la plus proche.",
    seeAllBuses: "Voir toutes les lignes de bus KTEL en Crète",
    seeAllBusesShort: "Voir toutes les lignes",
  },
  de: {
    heading: "Anreise mit dem Bus",
    directBus: "Direkter KTEL-Bus",
    fromCity: "ab",
    duration: "Dauer",
    price: "Preis",
    frequency: "Häufigkeit",
    noDirectBus: (p) => `Kein Direktbus nach ${p}`,
    noDirectBusHint:
      "Mietwagen, Taxi oder Umsteigen an der nächsten KTEL-Station.",
    seeAllBuses: "Alle KTEL-Buslinien auf Kreta anzeigen",
    seeAllBusesShort: "Alle Buslinien",
  },
  el: {
    heading: "Μετάβαση με λεωφορείο",
    directBus: "Άμεσο ΚΤΕΛ",
    fromCity: "από",
    duration: "Διάρκεια",
    price: "Τιμή",
    frequency: "Συχνότητα",
    noDirectBus: (p) => `Δεν υπάρχει άμεσο λεωφορείο προς ${p}`,
    noDirectBusHint:
      "Νοικιάστε αυτοκίνητο, πάρτε ταξί ή αλλάξτε στο πλησιέστερο σταθμό ΚΤΕΛ.",
    seeAllBuses: "Δείτε όλες τις γραμμές ΚΤΕΛ στην Κρήτη",
    seeAllBusesShort: "Όλες οι γραμμές",
  },
};

type MatchColumn = "things_to_do_slug" | "where_to_stay_slug" | "slug";

type Props = {
  /** Locale (server). */
  locale: string;
  /** Display name de la destination ("Malia", "Chania"…) · fallback dans le texte. */
  destinationName: string;
  /** Slug source à matcher dans bus_destinations. */
  matchSlug?: string;
  /** Colonne sur laquelle matcher. */
  matchOn?: MatchColumn;
};

const PRIORITY_FROM = ["Heraklion", "Chania", "Rethymno", "Agios Nikolaos"];

function pickLoc(locale: string): Loc {
  return (["en", "fr", "de", "el"] as const).includes(locale as Loc)
    ? (locale as Loc)
    : "en";
}

export async function BusAccessBox({
  locale,
  destinationName,
  matchSlug,
  matchOn = "things_to_do_slug",
}: Props) {
  const loc = pickLoc(locale);
  const t = L[loc];

  let dest: BusDestination | null = null;
  let routes: BusRoute[] = [];

  if (matchSlug) {
    const { data } = await supabase
      .from("bus_destinations")
      .select("*")
      .eq(matchOn, matchSlug)
      .maybeSingle();
    dest = (data as BusDestination | null) ?? null;

    if (dest?.slug) {
      const { data: routeRows } = await supabase
        .from("bus_routes")
        .select("*")
        .eq("to_slug", dest.slug)
        .in("from_place", PRIORITY_FROM)
        .order("price_eur", { ascending: true })
        .limit(3);
      routes = (routeRows as BusRoute[]) ?? [];
    }
  }

  const hasDirect = !!dest?.has_direct_bus && routes.length > 0;

  return (
    <section
      aria-labelledby="bus-access-heading"
      className="mt-10 mb-8 p-6 rounded-2xl border border-sea/15 bg-sea/5"
    >
      <div className="flex items-center gap-3 mb-4">
        <Bus className="w-5 h-5 text-sea" aria-hidden="true" />
        <h2
          id="bus-access-heading"
          className="text-xl font-bold text-sea m-0"
        >
          {t.heading}
        </h2>
      </div>

      {hasDirect ? (
        <ul className="space-y-3 mb-4 list-none p-0">
          {routes.slice(0, 2).map((r) => (
            <li key={r.id} className="text-sm">
              <div className="font-semibold mb-1">
                {t.directBus} {t.fromCity}{" "}
                <span className="text-sea">{r.from_place}</span>
              </div>
              <div className="text-text/80 flex flex-wrap gap-x-5 gap-y-1">
                {r.duration && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    {r.duration}
                  </span>
                )}
                {r.price_eur != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Euro className="w-3.5 h-3.5" aria-hidden="true" />
                    {r.price_eur} €
                  </span>
                )}
                {r.frequency && (
                  <span className="inline-flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5" aria-hidden="true" />
                    {r.frequency}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text/80 mb-4">
          {t.noDirectBus(destinationName)}. {t.noDirectBusHint}
        </p>
      )}

      <Link
        href={`/${loc}/buses`}
        className="inline-flex items-center gap-2 text-sea font-semibold hover:underline"
      >
        {t.seeAllBuses}
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
