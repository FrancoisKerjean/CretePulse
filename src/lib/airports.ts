import { supabase } from "./supabase";

/**
 * Crete airports served by the HCAA monthly traffic dataset
 * (table `hcaa_crete_monthly`, ingested from the official
 * "ΚΙΝΗΣΗ ΑΕΡΟΛΙΜΕΝΩΝ" XLSX published on ypa.gr, ~2 months delay).
 */
export type AirportLoc = "en" | "fr" | "de" | "el";

export interface CreteAirport {
  slug: string;
  iata: string;
  /** Official airport name (kept in English/Latin everywhere, like IATA). */
  officialName: string;
  city: Record<AirportLoc, string>;
  /** Greek genitive form, used in phrases like "το αεροδρόμιο Ηρακλείου". */
  cityGenitiveEl: string;
  region: "chania" | "heraklion" | "lasithi";
  lat: number;
  lng: number;
  /** Existing getting-around route slugs to cross-link, if any. */
  transferRoute: string | null;
  /** Nearby /airbnb/[neighbourhood] slugs to cross-link. */
  airbnbSlugs: string[];
}

export const CRETE_AIRPORTS: CreteAirport[] = [
  {
    slug: "heraklion",
    iata: "HER",
    officialName: "Heraklion International Airport “Nikos Kazantzakis”",
    city: { en: "Heraklion", fr: "Héraklion", de: "Heraklion", el: "Ηράκλειο" },
    cityGenitiveEl: "Ηρακλείου",
    region: "heraklion",
    lat: 35.3397,
    lng: 25.1803,
    transferRoute: "heraklion-airport-to-city",
    airbnbSlugs: ["heraklion", "hersonissos", "malevizi"],
  },
  {
    slug: "chania",
    iata: "CHQ",
    officialName: "Chania International Airport “Ioannis Daskalogiannis”",
    city: { en: "Chania", fr: "La Canée", de: "Chania", el: "Χανιά" },
    cityGenitiveEl: "Χανίων",
    region: "chania",
    lat: 35.5317,
    lng: 24.1497,
    transferRoute: "chania-airport-to-city",
    airbnbSlugs: ["chania", "platanias", "kissamos"],
  },
  {
    slug: "sitia",
    iata: "JSH",
    officialName: "Sitia Public Airport “Vitsentzos Kornaros”",
    city: { en: "Sitia", fr: "Sitia", de: "Sitia", el: "Σητεία" },
    cityGenitiveEl: "Σητείας",
    region: "lasithi",
    lat: 35.2161,
    lng: 26.1013,
    transferRoute: null,
    airbnbSlugs: ["sitia", "ierapetra", "agios-nikolaos"],
  },
];

export function findAirport(slug: string): CreteAirport | undefined {
  return CRETE_AIRPORTS.find(a => a.slug === slug);
}

export interface AirportMonthRow {
  year: number;
  month: number;
  pax_total: number | null;
  pax_embark: number | null;
  pax_disembark: number | null;
  aircraft_total: number | null;
  aircraft_intl: number | null;
  aircraft_dom: number | null;
  source_xlsx_url: string | null;
}

export interface AirportStats {
  /** Chronological rows (oldest first). */
  rows: AirportMonthRow[];
  /** Most recent month with data. */
  latest: AirportMonthRow;
  /** Latest month vs same month a year earlier, in %. */
  latestYoYPct: number | null;
  /** Sum of pax over the last 12 available months. */
  rolling12: number;
  /** Sum of pax over the 12 months before that window (null if not covered). */
  rolling12Prev: number | null;
  rolling12YoYPct: number | null;
  /** Last full calendar year present in the data. */
  lastFullYear: { year: number; pax: number } | null;
  /** Average pax per calendar month across all covered years (1-12). */
  monthlyAvg: Array<{ month: number; avg: number }>;
  busiestMonth: number;
  quietestMonth: number;
  /** Share of international aircraft movements over the last 12 months, %. */
  intlAircraftSharePct: number | null;
  sourceUrl: string | null;
}

function computeStats(rows: AirportMonthRow[]): AirportStats | null {
  const withPax = rows.filter(r => r.pax_total !== null);
  if (withPax.length === 0) return null;

  const latest = withPax[withPax.length - 1];

  const paxAt = (year: number, month: number): number | null => {
    const row = withPax.find(r => r.year === year && r.month === month);
    return row?.pax_total ?? null;
  };

  const prevYearSameMonth = paxAt(latest.year - 1, latest.month);
  const latestYoYPct =
    prevYearSameMonth && prevYearSameMonth > 0 && latest.pax_total !== null
      ? ((latest.pax_total - prevYearSameMonth) / prevYearSameMonth) * 100
      : null;

  const last12 = withPax.slice(-12);
  const rolling12 = last12.reduce((s, r) => s + (r.pax_total ?? 0), 0);
  const prev12 = withPax.slice(-24, -12);
  const rolling12Prev =
    prev12.length === 12
      ? prev12.reduce((s, r) => s + (r.pax_total ?? 0), 0)
      : null;
  const rolling12YoYPct =
    rolling12Prev && rolling12Prev > 0
      ? ((rolling12 - rolling12Prev) / rolling12Prev) * 100
      : null;

  // Last full calendar year (12 months present)
  const years = [...new Set(withPax.map(r => r.year))].sort((a, b) => b - a);
  let lastFullYear: AirportStats["lastFullYear"] = null;
  for (const y of years) {
    const yRows = withPax.filter(r => r.year === y);
    if (yRows.length === 12) {
      lastFullYear = { year: y, pax: yRows.reduce((s, r) => s + (r.pax_total ?? 0), 0) };
      break;
    }
  }

  // Seasonality: average per calendar month across covered years
  const monthlyAvg: Array<{ month: number; avg: number }> = [];
  for (let m = 1; m <= 12; m++) {
    const mRows = withPax.filter(r => r.month === m);
    if (mRows.length > 0) {
      monthlyAvg.push({
        month: m,
        avg: mRows.reduce((s, r) => s + (r.pax_total ?? 0), 0) / mRows.length,
      });
    }
  }
  const sortedByAvg = [...monthlyAvg].sort((a, b) => b.avg - a.avg);
  const busiestMonth = sortedByAvg[0]?.month ?? 8;
  const quietestMonth = sortedByAvg[sortedByAvg.length - 1]?.month ?? 2;

  const last12Intl = last12.reduce((s, r) => s + (r.aircraft_intl ?? 0), 0);
  const last12Total = last12.reduce((s, r) => s + (r.aircraft_total ?? 0), 0);
  const intlAircraftSharePct =
    last12Total > 0 ? (last12Intl / last12Total) * 100 : null;

  const sourceUrl =
    [...withPax].reverse().find(r => r.source_xlsx_url)?.source_xlsx_url ?? null;

  return {
    rows: withPax,
    latest,
    latestYoYPct,
    rolling12,
    rolling12Prev,
    rolling12YoYPct,
    lastFullYear,
    monthlyAvg,
    busiestMonth,
    quietestMonth,
    intlAircraftSharePct,
    sourceUrl,
  };
}

const ROW_SELECT =
  "year, month, pax_total, pax_embark, pax_disembark, " +
  "aircraft_total, aircraft_intl, aircraft_dom, source_xlsx_url";

/** Monthly HCAA traffic stats for one airport. */
export async function getAirportStats(iata: string): Promise<AirportStats | null> {
  const { data, error } = await supabase
    .from("hcaa_crete_monthly")
    .select(ROW_SELECT)
    .eq("airport_iata", iata)
    .order("year", { ascending: true })
    .order("month", { ascending: true });
  if (error) {
    console.error("getAirportStats", error);
    return null;
  }
  if (!data || data.length === 0) return null;
  return computeStats(data as unknown as AirportMonthRow[]);
}

/** Stats for all three airports in one query (index page). */
export async function getAllAirportStats(): Promise<Map<string, AirportStats>> {
  const out = new Map<string, AirportStats>();
  const { data, error } = await supabase
    .from("hcaa_crete_monthly")
    .select(ROW_SELECT + ", airport_iata")
    .order("year", { ascending: true })
    .order("month", { ascending: true });
  if (error || !data) {
    if (error) console.error("getAllAirportStats", error);
    return out;
  }
  type RowWithIata = AirportMonthRow & { airport_iata: string };
  const rows = data as unknown as RowWithIata[];
  for (const airport of CRETE_AIRPORTS) {
    const stats = computeStats(rows.filter(r => r.airport_iata === airport.iata));
    if (stats) out.set(airport.iata, stats);
  }
  return out;
}
