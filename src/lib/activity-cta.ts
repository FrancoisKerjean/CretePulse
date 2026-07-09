// CTA contextuel drawer /explore → verticale /activities (Lot 4 monétisation).
// Mappe le place_type d'un lieu cb_places vers la catégorie d'activités la plus
// pertinente + la ville de départ la plus proche parmi les 5 villes servies.
// Retourne null quand aucun mapping n'est pertinent (culture, sponsor, type
// inconnu, coords manquantes) : dans ce cas, pas de CTA.
import { ACTIVITY_CITIES, type ActivityCategorySlug, type ActivityCitySlug } from "./activity-taxonomy";
import { SLUG_COORDS } from "./taxi-fare";
import { haversineKm } from "./geo";

// Mapping type de lieu → catégorie /activities :
//   - littoral (plage, île) → sorties en bateau
//   - nature / gorges → randonnée & nature
//   - villes & villages → tours gastronomiques
// Les types "culture" (monastère, musée, fort...) et "activity" (déjà une
// activité) n'ont pas de catégorie pertinente : absents = pas de CTA.
const TYPE_TO_CATEGORY: Record<string, ActivityCategorySlug> = {
  beach: "boat-trips",
  island: "boat-trips",
  gorge: "hiking",
  mountain: "hiking",
  plateau: "hiking",
  "natural-park": "hiking",
  forest: "hiking",
  cave: "hiking",
  river: "hiking",
  waterfall: "hiking",
  lake: "hiking",
  nature: "hiking",
  geological: "hiking",
  flora: "hiking",
  fauna: "hiking",
  town: "food-tours",
};

export interface ActivityCta {
  category: ActivityCategorySlug;
  city: ActivityCitySlug;
}

/**
 * Catégorie + ville /activities pour un lieu de la carte, ou null si le lieu
 * ne s'y prête pas. La ville = la plus proche des 5 villes de la verticale
 * (coords partagées avec le calculateur taxi via SLUG_COORDS).
 */
export function activityCtaFor(
  placeType: string,
  latitude: number | null,
  longitude: number | null,
): ActivityCta | null {
  const category = TYPE_TO_CATEGORY[placeType];
  if (!category || latitude == null || longitude == null) return null;
  let city: ActivityCitySlug | null = null;
  let best = Infinity;
  for (const c of ACTIVITY_CITIES) {
    const coords = SLUG_COORDS[c.slug];
    if (!coords) continue;
    const km = haversineKm([latitude, longitude], coords);
    if (km < best) {
      best = km;
      city = c.slug;
    }
  }
  return city ? { category, city } : null;
}
