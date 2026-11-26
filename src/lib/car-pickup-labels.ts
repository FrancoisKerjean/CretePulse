// Libellés des points de prise de la location de voiture, par langue.
// SOURCE UNIQUE : l'assistant, les offres, la réservation, les e-mails et la
// page loueur (en anglais) lisent d'ici. Pur, importable client et serveur.
// Usage du site : « aéroport de Chania », « Héraklion » (accent en fr),
// « Flughafen Heraklion », « αεροδρόμιο Ηρακλείου ».

type Locale = "en" | "fr" | "de" | "el";
type Labels = Record<Locale, string>;

const same = (s: string, el: string): Labels => ({ en: s, fr: s, de: s, el });

const PICKUP_LABELS: Record<string, Labels> = {
  "chania-airport": { en: "Chania Airport (CHQ)", fr: "Aéroport de Chania (CHQ)", de: "Flughafen Chania (CHQ)", el: "Αεροδρόμιο Χανίων (CHQ)" },
  chania: same("Chania", "Χανιά"),
  platanias: same("Platanias", "Πλατανιάς"),
  kissamos: same("Kissamos", "Κίσσαμος"),
  paleochora: same("Paleochora", "Παλαιόχωρα"),
  kalyves: same("Kalyves", "Καλύβες"),
  georgioupolis: same("Georgioupolis", "Γεωργιούπολη"),
  rethymno: same("Rethymno", "Ρέθυμνο"),
  plakias: same("Plakias", "Πλακιάς"),
  panormo: same("Panormo", "Πάνορμο"),
  bali: same("Bali", "Μπαλί"),
  "heraklion-airport": { en: "Heraklion Airport (HER)", fr: "Aéroport d'Héraklion (HER)", de: "Flughafen Heraklion (HER)", el: "Αεροδρόμιο Ηρακλείου (HER)" },
  heraklion: { en: "Heraklion", fr: "Héraklion", de: "Heraklion", el: "Ηράκλειο" },
  hersonissos: same("Hersonissos", "Χερσόνησος"),
  malia: same("Malia", "Μάλια"),
  matala: same("Matala", "Μάταλα"),
  "agia-galini": same("Agia Galini", "Αγία Γαλήνη"),
  gouves: same("Gouves", "Γούβες"),
  "agios-nikolaos": same("Agios Nikolaos", "Άγιος Νικόλαος"),
  elounda: same("Elounda", "Ελούντα"),
  sitia: same("Sitia", "Σητεία"),
  ierapetra: same("Ierapetra", "Ιεράπετρα"),
  "makry-gyalos": same("Makry Gialos", "Μακρύ Γιαλός"),
  sisi: same("Sissi", "Σίσι"),
};

/** « heraklion-airport » → « Aéroport d'Héraklion (HER) ». Slug inconnu : mots capitalisés. */
export function pickupLabel(slug: string, locale = "en"): string {
  const labels = PICKUP_LABELS[slug];
  if (labels) return labels[(locale in labels ? locale : "en") as Locale];
  return slug.split("-").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

/** Slugs qui ont un libellé (contrôle : chaque point de prise doit en avoir un). */
export const LABELLED_PICKUPS = Object.keys(PICKUP_LABELS);
