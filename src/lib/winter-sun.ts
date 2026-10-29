// Mode hiver de la home : « où est le soleil », aujourd'hui et sur 5 jours.
// Lib pure (client/server) : ne lit que les CityWeather déjà chargés par la home,
// aucune source nouvelle, aucune estimation. Hors saison de baignade, la question
// utile n'est plus « quelle plage est calme » mais « où aller pour ne pas prendre
// la pluie », et les 10 stations météo y répondent déjà.
import type { CityWeather, ForecastDay } from "./weather";

/**
 * Saison de baignade : 1er mai → 15 octobre inclus, en date d'Athènes. Le reste
 * de l'année, la home passe en mode hiver (demandé par François le 29/10/2026 ;
 * bornes posées par Claude, à ajuster ici).
 */
export function isWinterSeason(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  if (month >= 5 && month <= 9) return false;
  if (month === 10) return day > 15;
  return true;
}

/** Codes WMO de pluie, bruine, neige, averse ou orage. */
const isWetCode = (code: number) => code >= 51;

/** Rang de ciel : 0 dégagé, 1 nuageux, 2 brouillard, 3 pluie. */
function skyRank(code: number): number {
  if (code <= 1) return 0;
  if (code <= 3) return 1;
  if (code < 51) return 2;
  return 3;
}

export interface SunNow {
  city: CityWeather;
  /** Vrai si la meilleure station est elle-même sous la pluie. */
  wetEverywhere: boolean;
  /** Stations qui relèvent de la pluie en ce moment, sur le total. */
  wetCount: number;
  total: number;
}

/** Station la plus ensoleillée en ce moment : sèche, puis ciel, puis température. */
export function sunNow(cities: CityWeather[]): SunNow | null {
  if (cities.length === 0) return null;
  const wet = (c: CityWeather) => isWetCode(c.weatherCode) || c.precipitation > 0;
  const ranked = [...cities].sort((a, b) =>
    Number(wet(a)) - Number(wet(b))
    || skyRank(a.weatherCode) - skyRank(b.weatherCode)
    || b.temp - a.temp,
  );
  return {
    city: ranked[0],
    wetEverywhere: wet(ranked[0]),
    wetCount: cities.filter(wet).length,
    total: cities.length,
  };
}

export interface SunDay {
  date: string;
  city: CityWeather;
  day: ForecastDay;
  /** Probabilité de pluie au plus sec de l'île : à partir de 60 %, il pleut partout. */
  wetEverywhere: boolean;
  /** Stations où la pluie est probable ce jour-là (≥ 50 %), du plus au moins exposé. */
  wetCities: CityWeather[];
}

export const WET_EVERYWHERE_PCT = 60;
export const RAIN_LIKELY_PCT = 50;

/** Pour chaque jour de prévision, la station au risque de pluie le plus bas. */
export function sunWeek(cities: CityWeather[]): SunDay[] {
  const days = Math.min(...cities.map((c) => c.daily.length));
  if (!Number.isFinite(days) || days === 0) return [];
  const out: SunDay[] = [];
  for (let d = 0; d < days; d++) {
    const ranked = [...cities].sort((a, b) =>
      a.daily[d].precipProb - b.daily[d].precipProb
      || skyRank(a.daily[d].weatherCode) - skyRank(b.daily[d].weatherCode)
      || b.daily[d].tempMax - a.daily[d].tempMax,
    );
    const best = ranked[0];
    out.push({
      date: best.daily[d].date,
      city: best,
      day: best.daily[d],
      wetEverywhere: best.daily[d].precipProb >= WET_EVERYWHERE_PCT,
      wetCities: ranked.filter((c) => c.daily[d].precipProb >= RAIN_LIKELY_PCT).reverse(),
    });
  }
  return out;
}
