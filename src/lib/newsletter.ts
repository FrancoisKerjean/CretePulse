import type { Beach, Event } from "./types";
import type { ScoredBeach, SwimToday } from "./swim-today";
import type { CityWeather } from "./weather";

// Weekly "Crete briefing" digest — pure selection/shaping logic, no I/O.
// The subscriber was promised (welcome email): this week's weather across the
// monitored cities, upcoming events, and one hand-picked pointer. This module
// turns the live swim/weather engine + events feed into that digest.

export const NEWSLETTER_LANGS = ["en", "fr", "de", "el"] as const;
export type NewsletterLang = (typeof NEWSLETTER_LANGS)[number];

export function normalizeLang(locale: string | null | undefined): NewsletterLang {
  return (NEWSLETTER_LANGS as readonly string[]).includes(locale ?? "")
    ? (locale as NewsletterLang)
    : "en";
}

export function beachName(b: Beach, lang: NewsletterLang): string {
  return b[`name_${lang}`] || b.name_en || b.slug;
}

export function eventTitle(e: Event, lang: NewsletterLang): string {
  return e[`title_${lang}`] || e.title_en || "";
}

export interface DigestBeach {
  slug: string;
  name: string;
  region: string;
  rating: ScoredBeach["rating"];
  seaTemp: number | null;
  windCardinal: string;
}

export interface DigestEvent {
  slug: string;
  title: string;
  dateStart: string;
  location: string;
}

/** Island-level aggregate forecast for one day (across the monitored cities). */
export interface DigestDay {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipProb: number;
}

/**
 * Collapse the per-city 6-day forecasts into one island-level week strip:
 * for each day, the island high (max), the island low (min), the most common
 * sky, and the highest rain probability anywhere. Empty when no forecast data.
 */
export function aggregateWeek(cities: CityWeather[]): DigestDay[] {
  const byDate = new Map<string, CityWeather["daily"]>();
  for (const c of cities) {
    for (const d of c.daily ?? []) {
      const arr = byDate.get(d.date) ?? [];
      arr.push(d);
      byDate.set(d.date, arr);
    }
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, ds]) => {
      const counts = new Map<number, number>();
      for (const d of ds) counts.set(d.weatherCode, (counts.get(d.weatherCode) ?? 0) + 1);
      const weatherCode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return {
        date,
        weatherCode,
        tempMax: Math.max(...ds.map((d) => d.tempMax)),
        tempMin: Math.min(...ds.map((d) => d.tempMin)),
        precipProb: Math.max(...ds.map((d) => d.precipProb)),
      };
    });
}

export interface NewsletterDigest {
  /** Deterministic hero swim pick of the week (null if the engine has no data). */
  swimPick: DigestBeach | null;
  /** Best calm beaches right now, excluding the hero pick. */
  calmBeaches: DigestBeach[];
  /** Island-level weather forecast for the days ahead. */
  week: DigestDay[];
  /** Dominant wind over the island. */
  wind: SwimToday["wind"] | null;
  /** Events starting within the next 7 days. */
  events: DigestEvent[];
  /** Number of monitored cities the weather is based on. */
  cityCount: number;
  /** Warmest sea among monitored cities, for the "water is X°C" line. */
  warmestSea: { name: string; seaTemp: number } | null;
}

function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

function toDigestBeach(s: ScoredBeach, lang: NewsletterLang): DigestBeach {
  return {
    slug: s.beach.slug,
    name: beachName(s.beach, lang),
    region: s.beach.region,
    rating: s.rating,
    seaTemp: s.seaTemp,
    windCardinal: s.windCardinal,
  };
}

/**
 * Build the weekly digest from live sources. Pure and deterministic given its
 * inputs. `weekStart` (YYYY-MM-DD, Athens day the digest is sent) windows the
 * events to the next 7 days inclusive.
 */
export function buildNewsletterDigest(
  swim: SwimToday | null,
  events: Event[],
  lang: NewsletterLang,
  weekStart: string,
  opts: { maxEvents?: number; maxBeaches?: number; maxDays?: number } = {},
): NewsletterDigest {
  const maxEvents = opts.maxEvents ?? 5;
  const maxBeaches = opts.maxBeaches ?? 3;

  const end = addDaysIso(weekStart, 7);
  const windowEvents: DigestEvent[] = events
    .filter((e) => e.verified && e.date_start >= weekStart && e.date_start <= end)
    .sort((a, b) => a.date_start.localeCompare(b.date_start))
    .slice(0, maxEvents)
    .map((e) => ({
      slug: e.slug,
      title: eventTitle(e, lang),
      dateStart: e.date_start,
      location: e.location_name || "",
    }));

  const pickSlug = swim?.pick?.beach.slug ?? null;
  const swimPick = swim?.pick ? toDigestBeach(swim.pick, lang) : null;

  const calmBeaches = swim
    ? swim.scored
        .filter((s) => s.rating === "calm" && s.beach.slug !== pickSlug)
        .slice(0, maxBeaches)
        .map((s) => toDigestBeach(s, lang))
    : [];

  const warmest = swim
    ? [...swim.cities]
        .filter((c) => c.seaTemp != null)
        .sort((a, b) => (b.seaTemp as number) - (a.seaTemp as number))[0]
    : undefined;

  const maxDays = opts.maxDays ?? 5;
  const week = swim ? aggregateWeek(swim.cities).slice(0, maxDays) : [];

  return {
    swimPick,
    calmBeaches,
    week,
    wind: swim?.wind ?? null,
    events: windowEvents,
    cityCount: swim?.cities.length ?? 0,
    warmestSea: warmest ? { name: warmest.name, seaTemp: warmest.seaTemp as number } : null,
  };
}

/** True when the digest has enough to be worth sending. */
export function digestHasContent(d: NewsletterDigest): boolean {
  return d.swimPick != null || d.events.length > 0 || d.week.length > 0;
}
