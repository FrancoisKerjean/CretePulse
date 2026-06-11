// L'ile de Crete en carte vivante : silhouette + pins live.
// v1 : path stylise (docs/design/kalimera/home-v8.html), positions calibrees.
// v2 future : path genere depuis geojson reel + projection lat/lng.
import type { CityWeather } from "@/lib/weather";

const CITY_POS: Record<string, { left: string; top: string }> = {
  "Chania": { left: "13%", top: "26%" },
  "Rethymno": { left: "27%", top: "28%" },
  "Heraklion": { left: "43%", top: "30%" },
  "Ag. Nikolaos": { left: "63%", top: "34%" },
  "Ierapetra": { left: "66%", top: "62%" },
  "Sitia": { left: "84%", top: "38%" },
};

export function CreteMap({ cities, swimPin, locale, updatedLabel }: {
  cities: CityWeather[];
  /** Pin terracotta de la plage du jour : { name, left, top } calibre cote appelant. */
  swimPin?: { name: string; left: string; top: string } | null;
  locale: string;
  updatedLabel?: string;
}) {
  const shown = cities.filter((c) => CITY_POS[c.name]).slice(0, 4);
  return (
    <div className="relative bg-white/58 backdrop-blur-md rounded-[30px] px-6 py-5 pb-3 shadow-[0_18px_50px_rgba(11,94,120,.22)]">
      <div className="relative">
        <svg viewBox="0 0 460 150" className="w-full block" aria-hidden>
          <defs>
            <linearGradient id="kisland" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9CCB72" /><stop offset=".55" stopColor="#7C9A53" /><stop offset="1" stopColor="#C9A36A" />
            </linearGradient>
          </defs>
          <path d="M14 84 C18 70 30 62 38 56 C40 44 46 30 54 30 C60 30 60 44 64 50 C70 44 76 32 84 32 C92 32 90 46 96 52 C104 44 112 36 122 38 C132 40 130 50 138 54 C160 48 184 50 204 56 C224 62 244 64 264 60 C272 50 282 44 290 48 C296 51 294 58 300 60 C320 56 342 58 360 64 C380 70 404 72 422 80 C436 86 446 92 444 100 C440 110 420 106 404 108 C380 112 356 118 332 114 C306 110 282 116 258 112 C232 108 206 112 182 106 C158 100 132 104 110 96 C88 90 64 94 44 90 C28 88 10 96 14 84 Z" fill="url(#kisland)" stroke="#fff" strokeWidth="3.5" strokeLinejoin="round" />
        </svg>
        {shown.map((c) => (
          <div key={c.name} className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-0.5" style={CITY_POS[c.name]}>
            <span className="bg-text text-white rounded-[11px] px-2.5 py-1 text-xs font-heading font-bold whitespace-nowrap font-data">{c.name} {c.temp}°</span>
            <span className="w-2.5 h-2.5 rounded-full bg-text border-[2.5px] border-white" />
          </div>
        ))}
        {swimPin && (
          <div className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-0.5" style={{ left: swimPin.left, top: swimPin.top }}>
            <span className="bg-terra text-white rounded-[11px] px-2.5 py-1 text-xs font-heading font-bold whitespace-nowrap">≈ {swimPin.name}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-terra border-[2.5px] border-white" />
          </div>
        )}
      </div>
      {updatedLabel && <p className="text-right text-[11.5px] text-text-muted m-0 pt-1.5">{updatedLabel}</p>}
    </div>
  );
}
