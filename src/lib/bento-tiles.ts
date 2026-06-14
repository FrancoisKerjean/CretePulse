// Tuiles dérivées par LLM (stockées en EN dans cb_places.bento_tiles JSONB).
// Champs tous optionnels : chaque famille n'en remplit qu'un sous-ensemble.

export type BentoFamily = "beach" | "heritage" | "nature" | "village" | "default";

export interface BentoTiles {
  // heritage
  century?: number | null;          // 14 -> rendu "XIV"
  frescoes_date?: string | null;    // "1360"
  walking_minutes?: number | null;  // 5
  unique_feature?: string | null;   // phrase courte EN, ex "Sinners painted near the entrance"
  // nature
  length_km?: number | null;
  elevation_m?: number | null;
  difficulty?: "easy" | "moderate" | "hard" | null;
  duration_minutes?: number | null;
  season?: string | null;           // EN, ex "May–Oct"
  // village
  population?: number | null;
  altitude_m?: number | null;
  specialty?: string | null;        // EN court, ex "Famous for chestnuts"
  // commun / fallback
  access_note?: string | null;      // EN court, ex "Reached on foot via village alleys"
}

const HERITAGE = new Set([
  "monastery", "church", "historical-site", "archaeological-site",
  "fort", "museum", "mythology", "tradition",
]);
const NATURE = new Set([
  "gorge", "cave", "lake", "waterfall", "forest", "mountain",
  "river", "plateau", "island", "geological", "natural-park", "nature",
]);

export function familyOf(placeType: string | null | undefined): BentoFamily {
  if (placeType === "beach") return "beach";
  if (placeType === "town") return "village";
  if (placeType && HERITAGE.has(placeType)) return "heritage";
  if (placeType && NATURE.has(placeType)) return "nature";
  return "default";
}
