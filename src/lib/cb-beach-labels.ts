import type { Locale } from "./types";

// Localized labels for the field-observed attribute values of cb_places
// beaches. Values are comma-separated English tokens from the source dataset;
// only known tokens are rendered (no invention on unknown values).

export const SAND_LABELS: Record<Locale, Record<string, string>> = {
  en: { "Sand": "sand", "Fine Pebbles": "fine pebbles", "Pebbles": "pebbles", "Rocks": "rocks", "Rocks in places": "rocky in places" },
  fr: { "Sand": "sable", "Fine Pebbles": "galets fins", "Pebbles": "galets", "Rocks": "rochers", "Rocks in places": "rocheux par endroits" },
  de: { "Sand": "Sand", "Fine Pebbles": "feine Kiesel", "Pebbles": "Kiesel", "Rocks": "Felsen", "Rocks in places": "stellenweise felsig" },
  el: { "Sand": "άμμος", "Fine Pebbles": "ψιλό βότσαλο", "Pebbles": "βότσαλο", "Rocks": "βράχια", "Rocks in places": "βραχώδης κατά τόπους" },
};

export const WATER_LABELS: Record<Locale, Record<string, string>> = {
  en: { "Blue": "blue", "Deep blue": "deep blue", "Turquoise": "turquoise", "Green": "green" },
  fr: { "Blue": "bleue", "Deep blue": "bleu profond", "Turquoise": "turquoise", "Green": "verte" },
  de: { "Blue": "blau", "Deep blue": "tiefblau", "Turquoise": "türkis", "Green": "grün" },
  el: { "Blue": "γαλάζια", "Deep blue": "βαθυγάλαζα", "Turquoise": "τιρκουάζ", "Green": "πράσινα" },
};

export const DEPTH_LABELS: Record<Locale, Record<string, string>> = {
  en: { "Shallow": "shallow", "Normal": "of normal depth", "Deep": "deep" },
  fr: { "Shallow": "peu profonde", "Normal": "de profondeur normale", "Deep": "profonde" },
  de: { "Shallow": "flach", "Normal": "normal tief", "Deep": "tief" },
  el: { "Shallow": "ρηχά", "Normal": "κανονικού βάθους", "Deep": "βαθιά" },
};

export const CROWD_LABELS: Record<Locale, Record<string, string>> = {
  en: { "None": "usually deserted", "Quiet": "usually quiet", "Normal": "moderately busy in season", "Crowded": "busy in season" },
  fr: { "None": "généralement déserte", "Quiet": "généralement tranquille", "Normal": "modérément fréquentée en saison", "Crowded": "fréquentée en saison" },
  de: { "None": "meist menschenleer", "Quiet": "meist ruhig", "Normal": "in der Saison mäßig besucht", "Crowded": "in der Saison gut besucht" },
  el: { "None": "συνήθως ερημική", "Quiet": "συνήθως ήσυχη", "Normal": "με μέτρια κίνηση τη σεζόν", "Crowded": "πολυσύχναστη τη σεζόν" },
};

export const SEA_LABELS: Record<Locale, Record<string, string>> = {
  en: { "Usually calm": "usually calm", "Usually wavy": "usually wavy", "Usually very wavy": "usually very wavy" },
  fr: { "Usually calm": "habituellement calme", "Usually wavy": "souvent agitée", "Usually very wavy": "souvent très agitée" },
  de: { "Usually calm": "meist ruhig", "Usually wavy": "oft bewegt", "Usually very wavy": "oft sehr bewegt" },
  el: { "Usually calm": "συνήθως ήρεμη", "Usually wavy": "συχνά κυματώδης", "Usually very wavy": "συχνά πολύ κυματώδης" },
};

export const FACILITY_LABELS: Record<Locale, Record<string, string>> = {
  en: { "Umbrellas / beds": "sunbeds and umbrellas", "Food / water nearby": "food and water nearby", "Accommodation options nearby": "accommodation nearby", "Lifeguard": "lifeguard in season", "Showers": "showers", "Blue Flag": "Blue Flag awarded", "Sports": "water sports", "Water sports": "water sports" },
  fr: { "Umbrellas / beds": "transats et parasols", "Food / water nearby": "restauration à proximité", "Accommodation options nearby": "hébergements à proximité", "Lifeguard": "maître-nageur en saison", "Showers": "douches", "Blue Flag": "Pavillon Bleu", "Sports": "sports nautiques", "Water sports": "sports nautiques" },
  de: { "Umbrellas / beds": "Liegen und Schirme", "Food / water nearby": "Verpflegung in der Nähe", "Accommodation options nearby": "Unterkünfte in der Nähe", "Lifeguard": "Rettungsschwimmer in der Saison", "Showers": "Duschen", "Blue Flag": "Blaue Flagge", "Sports": "Wassersport", "Water sports": "Wassersport" },
  el: { "Umbrellas / beds": "ξαπλώστρες και ομπρέλες", "Food / water nearby": "φαγητό και νερό κοντά", "Accommodation options nearby": "καταλύματα κοντά", "Lifeguard": "ναυαγοσώστης τη σεζόν", "Showers": "ντους", "Blue Flag": "Γαλάζια Σημαία", "Sports": "θαλάσσια σπορ", "Water sports": "θαλάσσια σπορ" },
};

export const ACCESS_LABELS: Record<Locale, Record<string, string>> = {
  en: { "Paved road": "paved road", "Dirt road": "dirt track", "Bus services": "served by bus", "Boat": "by boat", "Walking on a path": "on foot via a path", "Strolling": "easy walk" },
  fr: { "Paved road": "route goudronnée", "Dirt road": "piste", "Bus services": "desservie en bus", "Boat": "en bateau", "Walking on a path": "à pied par un sentier", "Strolling": "accès facile à pied" },
  de: { "Paved road": "asphaltierte Straße", "Dirt road": "Schotterpiste", "Bus services": "mit dem Bus erreichbar", "Boat": "per Boot", "Walking on a path": "zu Fuß über einen Pfad", "Strolling": "leicht zu Fuß" },
  el: { "Paved road": "ασφαλτόδρομος", "Dirt road": "χωματόδρομος", "Bus services": "με λεωφορείο", "Boat": "με σκάφος", "Walking on a path": "με μονοπάτι", "Strolling": "εύκολη πρόσβαση" },
};

/** First known token of a comma-separated value, localized. */
export function firstLabel(raw: string | null | undefined, dict: Record<string, string>): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0].trim();
  return dict[first] ?? null;
}

/** All known tokens of a comma-separated value, localized. */
export function allLabels(raw: string | null | undefined, dict: Record<string, string>): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map(tok => dict[tok.trim()])
    .filter((v): v is string => Boolean(v));
}
