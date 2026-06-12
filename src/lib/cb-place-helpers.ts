// Helpers purs pour les lieux cb_places :
//   - cleanCbDescription : retire le bruit widget scrape, extrait la liste
//     "À proximité" (nom + km) souvent collée à la fin de la description, et
//     decoupe le reste en paragraphes lisibles.
//   - nearestBusPlaceName : nom du lieu desservi par les bus KTEL le plus proche
//     de coords donnees (sert au deep-link /buses?to=...).

import { BUS_PLACE_SLUGS } from "./bus-pairs";
import { SLUG_COORDS } from "./taxi-fare";
import { nearestBy, type GeoPos } from "./geo";

// Phrases qui viennent du widget "What is near me" du site source et qui
// n'ont rien a faire dans le texte descriptif.
const NOISE_PATTERNS: RegExp[] = [
  /What is near me\?[\s\S]*$/i,
  /Search around location[\s\S]*$/i,
  /Additional Info\s*$/i,
  /Use my location\s+Select on map[\s\S]*$/i,
];

export interface NearbyPlace {
  name: string;
  km: number;
}

export function cleanCbDescription(raw: string | null | undefined): {
  paragraphs: string[];
  nearby: NearbyPlace[];
} {
  if (!raw) return { paragraphs: [], nearby: [] };
  let text = raw.trim();
  for (const pat of NOISE_PATTERNS) text = text.replace(pat, "").trim();

  // Detection de la liste "Nom ... N km Nom ... N km".
  // On considere qu'a partir de la PREMIERE occurrence "<texte> <num> km" suivie
  // d'au moins une autre, le reste du texte est une liste nearby.
  const nearby: NearbyPlace[] = [];
  const probe = /\s\d+(?:\.\d+)?\s+km\b/i;
  const firstKmIdx = text.search(probe);
  if (firstKmIdx > 80) {
    // Recule jusqu'au debut du nom (commence par majuscule, eventuellement
    // precede de "." ou ",").
    let start = firstKmIdx;
    while (start > 0 && !/[.!?]/.test(text[start - 1])) start--;
    const main = text.slice(0, start).trim().replace(/[,;:\s]+$/, "");
    const tail = text.slice(start);

    const re = /([^.!?\n]+?)\s+(\d+(?:\.\d+)?)\s+km\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(tail)) !== null) {
      const name = m[1].replace(/^[\s,;.]+/, "").trim();
      const km = parseFloat(m[2]);
      if (name && name.length < 140 && !Number.isNaN(km)) {
        nearby.push({ name, km });
      }
    }
    if (nearby.length >= 2) text = main;
    else nearby.length = 0;
  }

  // Paragraphage : on respecte les double newlines si presents, sinon on
  // regroupe par phrases (~2 phrases/paragraphe).
  let paragraphs = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  if (paragraphs.length <= 1 && text.length > 200) {
    const sentences = text
      .split(/(?<=[.!?])\s+(?=[A-ZΆ-Ώ"'«(])/)
      .map((s) => s.trim())
      .filter(Boolean);
    paragraphs = [];
    for (let i = 0; i < sentences.length; i += 2) {
      paragraphs.push(sentences.slice(i, i + 2).join(" "));
    }
  }

  return { paragraphs, nearby };
}

// Catalogue des lieux desservis (nom DB) avec coords connues.
let CATALOG_CACHE: Array<{ name: string; lat: number; lon: number }> | null = null;
function busPlaceCatalog() {
  if (CATALOG_CACHE) return CATALOG_CACHE;
  const out: Array<{ name: string; lat: number; lon: number }> = [];
  for (const [name, slug] of Object.entries(BUS_PLACE_SLUGS)) {
    const c = SLUG_COORDS[slug];
    if (c) out.push({ name, lat: c[0], lon: c[1] });
  }
  CATALOG_CACHE = out;
  return out;
}

/** Nom (cle DB) du lieu bus le plus proche, ou null si rien dans le rayon `maxKm`. */
export function nearestBusPlaceName(pos: GeoPos, maxKm = 20): string | null {
  const near = nearestBy(busPlaceCatalog(), (p) => [p.lat, p.lon], pos, 1)[0];
  if (!near || near.km > maxKm) return null;
  return near.name;
}
