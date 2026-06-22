// L'ile de Crete en carte vivante : vraie silhouette + pins live.
// v2 : path genere depuis le polygone reel (geoBoundaries GRC ADM1, ile
// principale, simplifie + lisse) via scripts/gen-crete-path.mjs ;
// pins projetes depuis lat/lng (equirectangular corrigee cos(lat)).
import type { CityWeather } from "@/lib/weather";

// Constantes de projection emises par scripts/gen-crete-path.mjs
const P = { minLon: 23.517561, maxLat: 35.6945495, k: 0.8160545, scale: 163.0796690, offX: 43.6417199, offY: 12, W: 460, H: 150 };

/** lat/lng -> position % dans la viewBox 460x150 de l'ile. */
export function creteProject(lat: number, lng: number): { left: string; top: string } {
  const x = P.offX + (lng - P.minLon) * P.k * P.scale;
  const y = P.offY + (P.maxLat - lat) * P.scale;
  return {
    left: `${Math.min(97, Math.max(3, (x / P.W) * 100)).toFixed(1)}%`,
    top: `${Math.min(94, Math.max(10, (y / P.H) * 100)).toFixed(1)}%`,
  };
}

// Silhouette reelle de la Crete (Gramvousa, Akrotiri, Mirabello, pointe de
// Sitia), 87 points lisses en quadratiques pour la rondeur Kalimera.
const CRETE_PATH = "M413.9 95.8 Q416.4 93.6 413.2 92.6 Q410 91.5 409.6 87.1 Q409.2 82.6 412.2 78.1 Q415.3 73.5 413.5 74.2 Q411.6 74.9 412.8 75.5 Q414.1 76.1 412.3 76.6 Q410.5 77.1 411.4 77.9 Q412.2 78.7 408.6 79.3 Q405.1 79.8 400.8 86.1 Q396.5 92.4 392.8 92.3 Q389.2 92.2 388.9 90.1 Q388.6 87.9 383.2 87.8 Q377.9 87.7 372.3 91.8 Q366.8 95.8 363.5 95.2 Q360.2 94.7 354.1 100.9 Q347.9 107.2 342.9 105.7 Q337.8 104.1 336.6 100.4 Q335.4 96.6 335.7 93 Q336 89.3 337.6 88.4 Q339.3 87.4 338.5 81.6 Q337.7 75.8 340.5 72.7 Q343.4 69.6 336.1 69.1 Q328.7 68.6 314 73 Q299.2 77.5 295.7 73.8 Q292.2 70.1 270.1 69.8 Q248 69.5 247.2 64.8 Q246.4 60 241.8 57.7 Q237.1 55.5 235.9 57.5 Q234.8 59.6 230.2 57.9 Q225.7 56.3 222.4 57.7 Q219 59 206.8 57.9 Q194.6 56.7 186.8 60.6 Q179.1 64.5 163.1 65.9 Q147.2 67.4 144.9 66.6 Q142.7 65.8 141.3 57 Q140 48.1 136.4 50 Q132.8 52 124.3 48.3 Q115.9 44.7 124.1 43.5 Q132.3 42.2 133.5 39.9 Q134.7 37.5 132.5 33.3 Q130.4 29.2 124.6 29 Q118.7 28.9 119 31.9 Q119.3 35 117 35.2 Q114.8 35.3 113.3 38.2 Q111.7 41.1 99.2 40.1 Q86.7 39.1 82.5 37.6 Q78.3 36 78 26.1 Q77.7 16.2 75.3 14.1 Q72.9 12 70.8 16.4 Q68.6 20.8 69.5 31.6 Q70.3 42.4 66.1 43.1 Q61.9 43.8 59.1 42.1 Q56.3 40.4 55.1 31.6 Q54 22.8 52.9 34.4 Q51.7 46 50.1 47.8 Q48.4 49.5 49.4 52.7 Q50.3 56 47.8 61.1 Q45.2 66.2 46.5 69.4 Q47.7 72.7 45.7 74.4 Q43.6 76.2 47.7 79.4 Q51.8 82.7 52.1 84.8 Q52.4 87 58.8 87.8 Q65.3 88.7 74.2 86.7 Q83.2 84.7 90.4 86.9 Q97.5 89.1 102 88.5 Q106.5 87.9 110.4 90.8 Q114.4 93.6 124.1 93.1 Q133.9 92.5 139.8 94.6 Q145.7 96.7 152.6 95.2 Q159.5 93.7 163.7 97.1 Q167.9 100.5 172.5 101.2 Q177.1 101.9 179.6 105.3 Q182 108.8 194 110.2 Q206 111.7 207.5 117.6 Q209.1 123.5 207.3 130.8 Q205.4 138 212.5 136.4 Q219.6 134.9 236.8 135.5 Q253.9 136.1 272.2 130.9 Q290.4 125.6 299.3 126.9 Q308.2 128.1 320.4 125.5 Q332.6 122.9 339.7 124.3 Q346.8 125.6 358.9 122.2 Q371 118.9 380.4 122.3 Q389.9 125.7 397.3 122.4 Q404.8 119.2 407.5 115.1 Q410.2 111 410.8 104.5 Q411.4 98 413.9 95.8 Z";

export function CreteMap({ cities, swimPin, locale, updatedLabel }: {
  cities: CityWeather[];
  /** Pin terracotta de la plage du jour : coordonnees reelles. */
  swimPin?: { name: string; lat: number; lng: number } | null;
  locale: string;
  updatedLabel?: string;
}) {
  const shown = cities.slice(0, 4);
  return (
    <div className="relative bg-white/58 backdrop-blur-md rounded-[30px] px-6 py-5 pb-3 shadow-[0_18px_50px_rgba(11,94,120,.22)]">
      <div className="relative">
        <svg viewBox="0 0 460 150" className="w-full block" aria-hidden>
          <defs>
            <linearGradient id="kisland" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9CCB72" /><stop offset=".55" stopColor="#7C9A53" /><stop offset="1" stopColor="#C9A36A" />
            </linearGradient>
          </defs>
          <path d={CRETE_PATH} fill="url(#kisland)" stroke="#fff" strokeWidth="3.5" strokeLinejoin="round" />
        </svg>
        {shown.map((c) => (
          <div key={c.name} className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-0.5" style={creteProject(c.lat, c.lng)}>
            <span className="bg-text text-white rounded-[11px] px-2.5 py-1 text-xs font-heading font-bold whitespace-nowrap font-data">{c.name} {c.temp}°</span>
            <span className="w-2.5 h-2.5 rounded-full bg-text border-[2.5px] border-white" />
          </div>
        ))}
        {swimPin && (
          <div className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-0.5" style={creteProject(swimPin.lat, swimPin.lng)}>
            <span className="bg-terracotta text-white rounded-[11px] px-2.5 py-1 text-xs font-heading font-bold whitespace-nowrap">≈ {swimPin.name}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-terracotta border-[2.5px] border-white" />
          </div>
        )}
      </div>
      {updatedLabel && <p className="text-right text-[11.5px] text-text-muted m-0 pt-1.5">{updatedLabel}</p>}
    </div>
  );
}
