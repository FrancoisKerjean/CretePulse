// Données pures des types de véhicule (id, pax, labels) · SANS icône, donc
// importable côté node (validation API + scripts check-*.mjs). car-types.ts
// recompose ces données avec les icônes React pour l'UI.
export interface CarTypeData {
  id: string;
  pax: string; // indicatif, affiché font-data
  labels: Record<string, string>; // en/fr/de/el
}

// Flotte calquée sur les groupes réels du partenaire Auto Smart (page
// our-vehicles de chaniacarrental.gr, vérifiée 12/06/2026) : A citadines,
// B compactes, C berlines, D automatiques, E SUV. Pas de scooter/ATV,
// 7 places ni cabriolet chez ce partenaire → retirés de la liste.
export const CAR_TYPES_DATA: CarTypeData[] = [
  { id: "city",      pax: "2-4", labels: { en: "City car", fr: "Citadine", de: "Kleinwagen", el: "Μικρό" } },
  { id: "compact",   pax: "4-5", labels: { en: "Compact", fr: "Compacte", de: "Kompakt", el: "Κόμπακτ" } },
  { id: "sedan",     pax: "5",   labels: { en: "Sedan", fr: "Berline", de: "Limousine", el: "Σεντάν" } },
  { id: "automatic", pax: "4-5", labels: { en: "Automatic", fr: "Boîte automatique", de: "Automatik", el: "Αυτόματο" } },
  { id: "suv",       pax: "5",   labels: { en: "SUV", fr: "SUV", de: "SUV", el: "SUV" } },
];
