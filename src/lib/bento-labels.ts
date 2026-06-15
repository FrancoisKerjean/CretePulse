// Labels/unités localisés des tuiles bento + libellé accordéon.
// Pattern aligné sur cb-type-labels.ts (en/fr/de/el complets, fallback EN).

type Dict = Record<string, Record<string, string>>;

const LABELS: Dict = {
  rating:        { en: "rating", fr: "note", de: "Bewertung", el: "βαθμός" },
  century:       { en: "century", fr: "siècle", de: "Jahrh.", el: "αιώνας" },
  frescoes:      { en: "frescoes", fr: "fresques", de: "Fresken", el: "τοιχογ." },
  distanceTown:  { en: "from town", fr: "de la ville", de: "vom Ort", el: "από πόλη" },
  walk:          { en: "on foot", fr: "à pied", de: "zu Fuß", el: "με τα πόδια" },
  length:        { en: "length", fr: "longueur", de: "Länge", el: "μήκος" },
  elevation:     { en: "elevation", fr: "dénivelé", de: "Höhe", el: "υψόμετρο" },
  difficulty:    { en: "difficulty", fr: "difficulté", de: "Schwierigkeit", el: "δυσκολία" },
  duration:      { en: "duration", fr: "durée", de: "Dauer", el: "διάρκεια" },
  season:        { en: "season", fr: "saison", de: "Saison", el: "εποχή" },
  population:    { en: "people", fr: "habitants", de: "Einwohner", el: "κάτοικοι" },
  altitude:      { en: "altitude", fr: "altitude", de: "Höhe", el: "υψόμετρο" },
  sand:          { en: "sand", fr: "sable", de: "Sand", el: "άμμος" },
  water:         { en: "water", fr: "eau", de: "Wasser", el: "νερό" },
  depth:         { en: "depth", fr: "profondeur", de: "Tiefe", el: "βάθος" },
  sea:           { en: "sea", fr: "mer", de: "Meer", el: "θάλασσα" },
  crowds:        { en: "crowds", fr: "affluence", de: "Andrang", el: "κόσμος" },
  access:        { en: "access", fr: "accès", de: "Zugang", el: "πρόσβαση" },
  rare:          { en: "Rare", fr: "Rare", de: "Selten", el: "Σπάνιο" },
  notable:       { en: "Notable", fr: "À noter", de: "Sehenswert", el: "Αξιοσημείωτο" },
  bestTime:      { en: "best time", fr: "quand", de: "wann", el: "πότε" },
  nearby:        { en: "nearby", fr: "à proximité", de: "in der Nähe", el: "κοντά" },
};

const DIFFICULTY: Dict = {
  easy:     { en: "Easy", fr: "Facile", de: "Leicht", el: "Εύκολο" },
  moderate: { en: "Moderate", fr: "Modéré", de: "Mittel", el: "Μέτριο" },
  hard:     { en: "Hard", fr: "Difficile", de: "Schwer", el: "Δύσκολο" },
};

const READ_MORE: Record<string, string> = {
  en: "Read the story", fr: "Lire l'histoire", de: "Die Geschichte lesen",
  el: "Διαβάστε την ιστορία", it: "Leggi la storia", es: "Leer la historia",
  nl: "Lees het verhaal", pt: "Ler a história",
};

export function bentoLabel(key: string, locale: string): string {
  return LABELS[key]?.[locale] || LABELS[key]?.en || key;
}
export function difficultyLabel(value: string, locale: string): string {
  return DIFFICULTY[value]?.[locale] || DIFFICULTY[value]?.en || value;
}
export function readMoreLabel(locale: string): string {
  return READ_MORE[locale] || READ_MORE.en;
}
export function nearbyCountLabel(n: number, locale: string): string {
  const word = bentoLabel("nearby", locale);
  return `${n} ${word}`;
}
