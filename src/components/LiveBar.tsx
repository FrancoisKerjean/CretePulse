// Barre de donnees live trans-site · la signature "compagnon pratique".
// Server component, cache 30 min, degrade en date seule si data KO.
// Hauteur FIXE (h-8) : zero layout shift.
// Spec : docs/superpowers/specs/2026-06-11-ui-live-data-redesign-design.md
import { fetchAllCitiesWeather, getWeatherIcon } from "@/lib/weather";
import { WindArrow } from "@/components/WindArrow";
import { CiSun, CiCloud, CiRain, CiWave } from "@/components/icons";

const SEA_LABELS: Record<string, Record<string, string>> = {
  calm: { en: "calm sea", fr: "mer calme", de: "ruhige See", el: "ήρεμη θάλασσα" },
  moderate: { en: "moderate sea", fr: "mer modérée", de: "mäßige See", el: "μέτρια θάλασσα" },
  rough: { en: "rough sea", fr: "mer agitée", de: "raue See", el: "ταραγμένη θάλασσα" },
};
const UPDATED = { en: "updated", fr: "màj", de: "Stand", el: "ενημ." } as const;

function seaState(waveHeights: (number | null)[]): "calm" | "moderate" | "rough" {
  const ws = waveHeights.filter((w): w is number => w != null);
  if (!ws.length) return "calm";
  const max = Math.max(...ws);
  return max < 0.5 ? "calm" : max < 1.2 ? "moderate" : "rough";
}

function CodeIcon({ code }: { code: number }) {
  const icon = getWeatherIcon(code);
  const cls = "w-3.5 h-3.5";
  if (icon === "sun") return <CiSun className={cls} />;
  if (icon === "rain") return <CiRain className={cls} />;
  return <CiCloud className={cls} />;
}

export async function LiveBar({ locale }: { locale: string }) {
  const ui = (["en", "fr", "de", "el"].includes(locale) ? locale : "en") as keyof typeof UPDATED;
  let cities = null;
  try {
    cities = await fetchAllCitiesWeather();
  } catch {
    /* degrade : date seule */
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Athens" });
  const timeStr = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Athens" });

  const her = cities?.find((c) => c.name === "Heraklion");
  const cha = cities?.find((c) => c.name === "Chania");
  const sea = cities ? seaState(cities.map((c) => c.waveHeight)) : null;

  return (
    <div className="h-8 bg-[#143A52] text-sand/90 font-data text-[11px] overflow-hidden">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center gap-x-4 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live-pulse" /> LIVE
        </span>
        {her && (
          <span className="inline-flex items-center gap-1">
            <CodeIcon code={her.weatherCode} /> {her.temp}° Heraklion
            <WindArrow deg={her.windDir} className="w-3 h-3" /> {her.windSpeed} km/h
          </span>
        )}
        {cha && (
          <span className="hidden sm:inline-flex items-center gap-1">
            <CodeIcon code={cha.weatherCode} /> {cha.temp}° Chania
            <WindArrow deg={cha.windDir} className="w-3 h-3" /> {cha.windSpeed} km/h
          </span>
        )}
        {sea && (
          <span className="hidden md:inline-flex items-center gap-1">
            <CiWave className="w-3 h-3" /> {SEA_LABELS[sea][ui]}
          </span>
        )}
        <span className="ml-auto hidden sm:inline text-sand/60">{dateStr}</span>
        <span className="text-sand/60">{UPDATED[ui]} {timeStr}</span>
      </div>
    </div>
  );
}
