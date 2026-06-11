"use client";

// "Les bons choix par zone" : la vraie silhouette de la Crete en selecteur.
// Survol = la zone se detoure (contour blanc, soulevee, le reste s'estompe) ;
// clic (ou pill) = fige la zone et filtre les precos en dessous.
// Points = plages des precos, projetees depuis leurs vraies coordonnees.
// Mockup valide Kami : ui-kalimera-region-picker-v4.html (12/06/2026)
import { useState } from "react";
import Link from "next/link";
import { Bus, Star } from "lucide-react";
import { BeachImage } from "@/components/BeachImage";
import { KriKri } from "@/components/KriKri";
import { creteProject } from "@/components/CreteMap";
import { CRETE_ZONE_PATHS } from "@/lib/crete-zones";

const EMPTY_ZONE: Record<string, string> = {
  en: "No pick in this area today · try another zone.",
  fr: "Pas de préco dans cette zone aujourd'hui · essaie une autre zone.",
  de: "Heute kein Tipp in diesem Gebiet · versuch eine andere Zone.",
  el: "Καμία πρόταση σε αυτή την περιοχή σήμερα · δοκίμασε άλλη ζώνη.",
};

const CRETE_PATH = "M413.9 95.8 Q416.4 93.6 413.2 92.6 Q410 91.5 409.6 87.1 Q409.2 82.6 412.2 78.1 Q415.3 73.5 413.5 74.2 Q411.6 74.9 412.8 75.5 Q414.1 76.1 412.3 76.6 Q410.5 77.1 411.4 77.9 Q412.2 78.7 408.6 79.3 Q405.1 79.8 400.8 86.1 Q396.5 92.4 392.8 92.3 Q389.2 92.2 388.9 90.1 Q388.6 87.9 383.2 87.8 Q377.9 87.7 372.3 91.8 Q366.8 95.8 363.5 95.2 Q360.2 94.7 354.1 100.9 Q347.9 107.2 342.9 105.7 Q337.8 104.1 336.6 100.4 Q335.4 96.6 335.7 93 Q336 89.3 337.6 88.4 Q339.3 87.4 338.5 81.6 Q337.7 75.8 340.5 72.7 Q343.4 69.6 336.1 69.1 Q328.7 68.6 314 73 Q299.2 77.5 295.7 73.8 Q292.2 70.1 270.1 69.8 Q248 69.5 247.2 64.8 Q246.4 60 241.8 57.7 Q237.1 55.5 235.9 57.5 Q234.8 59.6 230.2 57.9 Q225.7 56.3 222.4 57.7 Q219 59 206.8 57.9 Q194.6 56.7 186.8 60.6 Q179.1 64.5 163.1 65.9 Q147.2 67.4 144.9 66.6 Q142.7 65.8 141.3 57 Q140 48.1 136.4 50 Q132.8 52 124.3 48.3 Q115.9 44.7 124.1 43.5 Q132.3 42.2 133.5 39.9 Q134.7 37.5 132.5 33.3 Q130.4 29.2 124.6 29 Q118.7 28.9 119 31.9 Q119.3 35 117 35.2 Q114.8 35.3 113.3 38.2 Q111.7 41.1 99.2 40.1 Q86.7 39.1 82.5 37.6 Q78.3 36 78 26.1 Q77.7 16.2 75.3 14.1 Q72.9 12 70.8 16.4 Q68.6 20.8 69.5 31.6 Q70.3 42.4 66.1 43.1 Q61.9 43.8 59.1 42.1 Q56.3 40.4 55.1 31.6 Q54 22.8 52.9 34.4 Q51.7 46 50.1 47.8 Q48.4 49.5 49.4 52.7 Q50.3 56 47.8 61.1 Q45.2 66.2 46.5 69.4 Q47.7 72.7 45.7 74.4 Q43.6 76.2 47.7 79.4 Q51.8 82.7 52.1 84.8 Q52.4 87 58.8 87.8 Q65.3 88.7 74.2 86.7 Q83.2 84.7 90.4 86.9 Q97.5 89.1 102 88.5 Q106.5 87.9 110.4 90.8 Q114.4 93.6 124.1 93.1 Q133.9 92.5 139.8 94.6 Q145.7 96.7 152.6 95.2 Q159.5 93.7 163.7 97.1 Q167.9 100.5 172.5 101.2 Q177.1 101.9 179.6 105.3 Q182 108.8 194 110.2 Q206 111.7 207.5 117.6 Q209.1 123.5 207.3 130.8 Q205.4 138 212.5 136.4 Q219.6 134.9 236.8 135.5 Q253.9 136.1 272.2 130.9 Q290.4 125.6 299.3 126.9 Q308.2 128.1 320.4 125.5 Q332.6 122.9 339.7 124.3 Q346.8 125.6 358.9 122.2 Q371 118.9 380.4 122.3 Q389.9 125.7 397.3 122.4 Q404.8 119.2 407.5 115.1 Q410.2 111 410.8 104.5 Q411.4 98 413.9 95.8 Z";

export type ZoneKey = "west" | "central" | "east" | "south";
const ZONE_ORDER: ZoneKey[] = ["west", "central", "east", "south"];

export interface RegionBeachLite {
  name: string;
  slug: string;
  imageUrl: string | null;
  rating: "calm" | "fair" | "exposed";
  /** Ligne meta deja localisee cote serveur (vent · km/h · houle · sable). */
  metaLine: string;
  /** Arret de bus deja localise, null si aucun. */
  busLine: string | null;
  starRating: number | null;
  lat: number;
  lng: number;
}

const DOT_COLOR: Record<RegionBeachLite["rating"], string> = {
  calm: "#14B86B",
  fair: "#FFC83D",
  exposed: "#ED7A5C",
};
const PILL_CLASS: Record<RegionBeachLite["rating"], string> = {
  calm: "bg-[rgba(20,184,107,.13)] text-[#0B8A52]",
  fair: "bg-sun/20 text-[#8A6A14]",
  exposed: "bg-terra/15 text-[#B84B30]",
};

// Position des labels de zone autour de l'ile (viewBox 460x176, ile 460x150)
const ZONE_LABELS: Record<ZoneKey, { x: number; y: number }> = {
  west: { x: 78, y: 170 },
  central: { x: 195, y: 38 },
  south: { x: 228, y: 170 },
  east: { x: 370, y: 52 },
};

const pct = (s: string) => parseFloat(s);

export function RegionPicker({ zones, regionLabels, allLabel, hint, ratingLabels, locale }: {
  zones: Record<ZoneKey, RegionBeachLite[]>;
  regionLabels: Record<string, string>;
  allLabel: string;
  hint: string;
  ratingLabels: Record<"calm" | "fair" | "exposed", string>;
  locale: string;
}) {
  const [active, setActive] = useState<ZoneKey | "all">("all");

  const dots = ZONE_ORDER.flatMap((z) => zones[z] ?? []);
  const shownZones = active === "all" ? ZONE_ORDER : [active];
  const beaches = shownZones.flatMap((z) => (zones[z] ?? []).map((b) => ({ ...b, zone: z })));

  return (
    <div>
      {/* pills regions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", ...ZONE_ORDER] as const).map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => setActive(z === "all" ? "all" : (z as ZoneKey))}
            className={`rounded-full px-4 py-2 font-heading text-[13px] font-bold transition-colors ${
              active === z ? "bg-text text-white" : "bg-white text-text-muted shadow-[0_6px_16px_rgba(11,94,120,.08)] hover:text-aegean"
            }`}
          >
            {z === "all" ? allLabel : regionLabels[z] ?? z}
          </button>
        ))}
      </div>

      {/* carte selecteur */}
      <div className="bg-white rounded-[30px] px-6 pt-5 pb-3 shadow-[0_12px_32px_rgba(11,94,120,.10)] mb-4">
        <svg viewBox="0 0 460 176" className="w-full block kzones" role="group" aria-label={allLabel}>
          <defs>
            <linearGradient id="kpz" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9CCB72" /><stop offset=".55" stopColor="#7C9A53" /><stop offset="1" stopColor="#C9A36A" />
            </linearGradient>
          </defs>
          <path d={CRETE_PATH} fill="url(#kpz)" stroke="#fff" strokeWidth="3.5" strokeLinejoin="round" />
          {dots.map((b) => {
            const p = creteProject(b.lat, b.lng);
            return (
              <circle
                key={b.slug}
                cx={(pct(p.left) / 100) * 460}
                cy={(pct(p.top) / 100) * 150}
                r="5"
                fill={DOT_COLOR[b.rating]}
                stroke="#fff"
                strokeWidth="1.6"
                pointerEvents="none"
              />
            );
          })}
          {ZONE_ORDER.map((z) => (
            <path
              key={z}
              d={CRETE_ZONE_PATHS[z]}
              className={`kzone ${active === z ? "kzone-active" : ""} ${active !== "all" && active !== z ? "kzone-dimmed" : ""}`}
              onClick={() => setActive(active === z ? "all" : z)}
              role="button"
              aria-label={regionLabels[z] ?? z}
            />
          ))}
          {ZONE_ORDER.map((z) => (
            <text key={`l-${z}`} x={ZONE_LABELS[z].x} y={ZONE_LABELS[z].y}
                  className="font-heading" fontSize="13" fontWeight="700" fill="#0B5E78" pointerEvents="none">
              {regionLabels[z] ?? z}
            </text>
          ))}
        </svg>
        <p className="text-center text-xs text-text-muted m-0 mt-2">{hint}</p>
        <div className="flex gap-4 justify-center text-[11.5px] text-text-muted pt-1.5 pb-1">
          {(["calm", "fair", "exposed"] as const).map((r) => (
            <span key={r} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: DOT_COLOR[r] }} />
              {ratingLabels[r]}
            </span>
          ))}
        </div>
      </div>

      {/* precos de la zone */}
      {beaches.length === 0 && (
        <div className="rounded-3xl bg-white p-5 shadow-[0_12px_30px_rgba(11,94,120,.10)] flex items-center gap-4">
          <KriKri mood="empty" className="w-20 h-16 shrink-0" />
          <p className="text-sm text-text-muted m-0">{EMPTY_ZONE[locale] ?? EMPTY_ZONE.en}</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        {beaches.map((b) => (
          <Link
            key={b.slug}
            href={`/${locale}/beaches/${b.slug}`}
            className="flex items-center gap-3.5 rounded-3xl bg-white p-3 shadow-[0_12px_30px_rgba(11,94,120,.10)] hover:shadow-[0_14px_36px_rgba(11,94,120,.16)] transition-shadow no-underline"
          >
            <div className="relative w-16 h-12 rounded-2xl overflow-hidden shrink-0">
              <BeachImage src={b.imageUrl} alt={b.name} className="w-16 h-12 object-cover saturate-[1.08]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-heading font-bold text-text truncate m-0">
                {b.name}
                {b.starRating != null && b.starRating >= 3.5 && (
                  <span className="ml-2 inline-flex items-center gap-0.5 text-xs font-semibold text-[#8A6A14]">
                    <Star className="h-3 w-3 fill-current" /> {b.starRating.toFixed(1)}
                  </span>
                )}
              </p>
              <p className="text-xs text-text-muted m-0 font-data">{b.metaLine}</p>
              {b.busLine && (
                <p className="text-xs text-text-light inline-flex items-center gap-1 m-0">
                  <Bus className="h-3 w-3" /> {b.busLine}
                </p>
              )}
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold font-data ${PILL_CLASS[b.rating]}`}>
              ≈ {ratingLabels[b.rating]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
