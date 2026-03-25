/**
 * Open-Meteo API client - free, unlimited, no API key needed.
 * Fetches weather + marine data for Crete cities.
 */

export interface CityWeather {
  name: string;
  nameEl: string;
  lat: number;
  lng: number;
  temp: number;
  windSpeed: number;
  windDir: number;
  weatherCode: number;
  seaTemp: number | null;
  waveHeight: number | null;
  uvIndex: number;
  precipitation: number;
}

export const CRETE_CITIES = [
  { name: "Heraklion", nameEl: "Ηράκλειο", lat: 35.34, lng: 25.13 },
  { name: "Chania", nameEl: "Χανιά", lat: 35.51, lng: 24.02 },
  { name: "Rethymno", nameEl: "Ρέθυμνο", lat: 35.37, lng: 24.47 },
  { name: "Ag. Nikolaos", nameEl: "Αγ. Νικόλαος", lat: 35.19, lng: 25.72 },
  { name: "Ierapetra", nameEl: "Ιεράπετρα", lat: 35.01, lng: 25.74 },
  { name: "Sitia", nameEl: "Σητεία", lat: 35.21, lng: 26.10 },
  { name: "Makrigialos", nameEl: "Μακρύγιαλος", lat: 35.03, lng: 25.97 },
  { name: "Elounda", nameEl: "Ελούντα", lat: 35.26, lng: 25.73 },
  { name: "Hersonissos", nameEl: "Χερσόνησος", lat: 35.31, lng: 25.38 },
  { name: "Malia", nameEl: "Μάλια", lat: 35.29, lng: 25.46 },
] as const;

const WEATHER_CODES: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  80: "Rain showers",
  95: "Thunderstorm",
};

export function getWeatherLabel(code: number): string {
  return WEATHER_CODES[code] || "Unknown";
}

export function getWeatherIcon(code: number): "sun" | "cloud" | "rain" | "wind" {
  if (code <= 1) return "sun";
  if (code <= 3) return "cloud";
  if (code >= 51) return "rain";
  return "cloud";
}

export async function fetchAllCitiesWeather(): Promise<CityWeather[]> {
  const lats = CRETE_CITIES.map((c) => c.lat).join(",");
  const lngs = CRETE_CITIES.map((c) => c.lng).join(",");

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,uv_index,precipitation&timezone=Europe/Athens`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    // Marine data for sea temperature
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lats}&longitude=${lngs}&current=sea_surface_temperature,wave_height&timezone=Europe/Athens`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let marineData: any = null;
    try {
      const marineRes = await fetch(marineUrl, { cache: "no-store" });
      marineData = await marineRes.json();
    } catch {
      // Marine data is optional
    }

    const results = CRETE_CITIES.map((city, i) => {
      const current = Array.isArray(data) ? data[i]?.current : data.current;
      const marine = marineData && Array.isArray(marineData) ? marineData[i]?.current : null;
      return {
        name: city.name,
        nameEl: city.nameEl,
        lat: city.lat,
        lng: city.lng,
        temp: Math.round(current?.temperature_2m ?? 0),
        windSpeed: Math.round(current?.wind_speed_10m ?? 0),
        windDir: current?.wind_direction_10m ?? 0,
        weatherCode: current?.weather_code ?? 0,
        seaTemp: marine?.sea_surface_temperature ? Math.round(marine.sea_surface_temperature) : null,
        waveHeight: marine?.wave_height ?? null,
        uvIndex: Math.round(current?.uv_index ?? 0),
        precipitation: current?.precipitation ?? 0,
      };
    });

    // Verify data is valid (not all zeros)
    if (results.some(r => r.temp > 0)) return results;

    // If all temps are 0, fallback to Supabase cache
    throw new Error("All temperatures are 0, falling back to cache");
  } catch {
    // Fallback: read from Supabase weather_cache
    const { supabase } = await import("./supabase");
    const { data: cache } = await supabase.from("weather_cache").select("*");

    return CRETE_CITIES.map((city) => {
      const slug = city.name.toLowerCase().replace(/[^a-z]/g, "-").replace(/-+/g, "-");
      const cached = (cache || []).find((c: { city_slug: string }) =>
        c.city_slug === slug || c.city_slug === city.name.toLowerCase().replace(/ /g, "-").replace(/\./g, "")
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d: any = cached ? (typeof cached.data === "string" ? JSON.parse(cached.data) : cached.data) : {};
      return {
        name: city.name,
        nameEl: city.nameEl,
        lat: city.lat,
        lng: city.lng,
        temp: Math.round(d.temp ?? 0),
        windSpeed: Math.round(d.wind_speed ?? 0),
        windDir: d.wind_dir ?? 0,
        weatherCode: d.weather_code ?? 0,
        seaTemp: d.sea_temp ? Math.round(d.sea_temp) : null,
        waveHeight: d.wave_height ?? null,
        uvIndex: Math.round(d.uv_index ?? 0),
        precipitation: d.precipitation ?? 0,
      };
    });
  }
}
