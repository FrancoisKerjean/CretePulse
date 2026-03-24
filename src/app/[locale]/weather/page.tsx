import { getTranslations } from "next-intl/server";
import { fetchAllCitiesWeather, getWeatherLabel, getWeatherIcon } from "@/lib/weather";
import type { Locale } from "@/lib/types";
import { Wind, Droplets, Sun, Thermometer, Waves, Eye } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return {
    title: "Weather in Crete - CretePulse",
    description: "Live weather for 10 cities across Crete. Temperature, wind, sea temperature, UV index. Updated hourly.",
  };
}

const TITLES: Record<Locale, string> = {
  en: "Weather in Crete",
  fr: "Météo en Crète",
  de: "Wetter auf Kreta",
  el: "Καιρός στην Κρήτη",
};

const SUBTITLES: Record<Locale, string> = {
  en: "10 cities, updated every hour. Air, sea, wind, UV.",
  fr: "10 villes, mis à jour toutes les heures. Air, mer, vent, UV.",
  de: "10 Städte, stündlich aktualisiert. Luft, Meer, Wind, UV.",
  el: "10 πόλεις, ανανέωση κάθε ώρα. Αέρας, θάλασσα, άνεμος, UV.",
};

function WindArrow({ deg }: { deg: number }) {
  return (
    <span
      className="inline-block text-text-muted"
      style={{ transform: `rotate(${deg}deg)`, display: "inline-block" }}
      title={`${deg}°`}
    >
      ↑
    </span>
  );
}

function WeatherEmoji({ code }: { code: number }) {
  const icon = getWeatherIcon(code);
  if (icon === "sun") return <span className="text-3xl">☀️</span>;
  if (icon === "rain") return <span className="text-3xl">🌧️</span>;
  if (icon === "wind") return <span className="text-3xl">💨</span>;
  return <span className="text-3xl">⛅</span>;
}

function UVBadge({ uv }: { uv: number }) {
  let color = "bg-olive/10 text-olive";
  if (uv >= 8) color = "bg-red-50 text-red-600";
  else if (uv >= 6) color = "bg-orange-50 text-orange-600";
  else if (uv >= 3) color = "bg-yellow-50 text-yellow-600";
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${color}`}>
      UV {uv}
    </span>
  );
}

export default async function WeatherPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;

  let cities: Awaited<ReturnType<typeof fetchAllCitiesWeather>> = [];
  let fetchError = false;
  try {
    cities = await fetchAllCitiesWeather();
  } catch {
    fetchError = true;
  }

  if (fetchError || cities.length === 0) {
    return <WeatherPlaceholder locale={loc} />;
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-aegean">{TITLES[loc]}</h1>
          <p className="text-text-muted mt-2">{SUBTITLES[loc]}</p>
        </div>

        {/* Cities grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cities.map((city) => (
            <div
              key={city.name}
              className="rounded-xl border border-border bg-white overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Card header */}
              <div className="bg-aegean px-4 pt-4 pb-3 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold text-lg leading-tight">{city.name}</h2>
                    <p className="text-white/70 text-xs mt-0.5">{city.nameEl}</p>
                  </div>
                  <WeatherEmoji code={city.weatherCode} />
                </div>
                <div className="flex items-end gap-2 mt-3">
                  <span className="text-4xl font-bold">{city.temp}°</span>
                  <span className="text-white/70 text-sm pb-1">C</span>
                </div>
                <p className="text-white/80 text-sm mt-1">{getWeatherLabel(city.weatherCode)}</p>
              </div>

              {/* Stats */}
              <div className="p-4 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-aegean shrink-0" />
                  <div>
                    <p className="text-xs text-text-muted">Wind</p>
                    <p className="text-sm font-semibold">
                      {city.windSpeed} km/h{" "}
                      <WindArrow deg={city.windDir} />
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-aegean shrink-0" />
                  <div>
                    <p className="text-xs text-text-muted">Sea temp</p>
                    <p className="text-sm font-semibold">
                      {city.seaTemp != null ? `${city.seaTemp}°C` : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs text-text-muted">UV index</p>
                    <div className="mt-0.5">
                      <UVBadge uv={city.uvIndex} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-aegean shrink-0" />
                  <div>
                    <p className="text-xs text-text-muted">Rain</p>
                    <p className="text-sm font-semibold">{city.precipitation} mm</p>
                  </div>
                </div>
              </div>

              {/* Wave height if available */}
              {city.waveHeight != null && (
                <div className="px-4 pb-3 border-t border-border pt-3">
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Waves className="w-4 h-4 text-aegean" />
                    Waves: <span className="font-semibold text-text">{city.waveHeight.toFixed(1)} m</span>
                  </div>
                </div>
              )}

              {/* 5-day forecast placeholder */}
              <div className="px-4 pb-4 border-t border-border pt-3">
                <p className="text-xs text-text-muted mb-2">5-day forecast</p>
                <div className="flex gap-1 justify-between">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i + 1);
                    return (
                      <div key={i} className="flex-1 text-center">
                        <p className="text-[10px] text-text-muted">
                          {d.toLocaleDateString("en-GB", { weekday: "short" })}
                        </p>
                        <div className="h-6 bg-stone rounded mt-1 animate-pulse" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Data source */}
        <p className="text-xs text-text-light mt-8 text-center">
          Data from{" "}
          <a
            href="https://open-meteo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Open-Meteo
          </a>
          {" "}— free & open source. Updated every hour.
        </p>
      </div>
    </main>
  );
}

function WeatherPlaceholder({ locale }: { locale: Locale }) {
  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-aegean">{TITLES[locale]}</h1>
        <p className="text-text-muted mt-2">{SUBTITLES[locale]}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-white overflow-hidden animate-pulse">
              <div className="h-28 bg-aegean/20" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-stone rounded w-3/4" />
                <div className="h-4 bg-stone rounded w-1/2" />
                <div className="h-4 bg-stone rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
