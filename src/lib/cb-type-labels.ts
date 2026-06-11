// Labels localisés des types de lieux cb_places (en/fr/de/el, fallback EN).
// Partagé entre l'explorateur (/explore) et le deck de match (/match).

export const TYPE_LABELS: Record<string, Record<string, string>> = {
  beach: { en: "Beaches", fr: "Plages", de: "Strände", el: "Παραλίες" },
  gorge: { en: "Gorges", fr: "Gorges", de: "Schluchten", el: "Φαράγγια" },
  cave: { en: "Caves", fr: "Grottes", de: "Höhlen", el: "Σπήλαια" },
  town: { en: "Towns", fr: "Villes", de: "Städte", el: "Πόλεις" },
  island: { en: "Islands", fr: "Îles", de: "Inseln", el: "Νησιά" },
  lake: { en: "Lakes", fr: "Lacs", de: "Seen", el: "Λίμνες" },
  lighthouse: { en: "Lighthouses", fr: "Phares", de: "Leuchttürme", el: "Φάροι" },
  mountain: { en: "Mountains", fr: "Montagnes", de: "Berge", el: "Βουνά" },
  monastery: { en: "Monasteries", fr: "Monastères", de: "Klöster", el: "Μοναστήρια" },
  "historical-site": { en: "History", fr: "Histoire", de: "Geschichte", el: "Ιστορία" },
  plateau: { en: "Plateaus", fr: "Plateaux", de: "Hochebenen", el: "Οροπέδια" },
  "natural-park": { en: "Parks", fr: "Parcs", de: "Parks", el: "Πάρκα" },
  geological: { en: "Geology", fr: "Géologie", de: "Geologie", el: "Γεωλογία" },
  river: { en: "Rivers", fr: "Rivières", de: "Flüsse", el: "Ποτάμια" },
  waterfall: { en: "Waterfalls", fr: "Cascades", de: "Wasserfälle", el: "Καταρράκτες" },
  forest: { en: "Forests", fr: "Forêts", de: "Wälder", el: "Δάση" },
  flora: { en: "Flora", fr: "Flore", de: "Flora", el: "Χλωρίδα" },
  fauna: { en: "Fauna", fr: "Faune", de: "Fauna", el: "Πανίδα" },
  activity: { en: "Activities", fr: "Activités", de: "Aktivitäten", el: "Δραστηριότητες" },
  tradition: { en: "Traditions", fr: "Traditions", de: "Traditionen", el: "Παραδόσεις" },
  nature: { en: "Nature", fr: "Nature", de: "Natur", el: "Φύση" },
  museum: { en: "Museums", fr: "Musées", de: "Museen", el: "Μουσεία" },
  fort: { en: "Forts & Castles", fr: "Forts & Châteaux", de: "Festungen", el: "Φρούρια" },
  "archaeological-site": { en: "Archaeology", fr: "Archéologie", de: "Archäologie", el: "Αρχαιολογία" },
  mythology: { en: "Mythology", fr: "Mythologie", de: "Mythologie", el: "Μυθολογία" },
  church: { en: "Churches", fr: "Églises", de: "Kirchen", el: "Εκκλησίες" },
  other: { en: "Other", fr: "Autres", de: "Sonstiges", el: "Άλλα" },
};

export function typeLabel(type: string, locale: string): string {
  return TYPE_LABELS[type]?.[locale] || TYPE_LABELS[type]?.en || type;
}
