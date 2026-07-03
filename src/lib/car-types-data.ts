// Données pures des types de véhicule (id, pax, labels) · SANS icône, donc
// importable côté node (validation API + scripts check-*.mjs). car-types.ts
// recompose ces données avec les icônes React pour l'UI.
export interface CarTypeData {
  id: string;
  pax: string; // indicatif, affiché font-data
  labels: Record<string, string>; // en/fr/de/el
  examples: string[]; // exemples de modèles de la flotte Auto Smart, pour concrétiser le choix
  photo: string; // /images/cars/<id>.jpg · photo libre de droits illustrant la catégorie
}

// Flotte calquée sur les groupes réels du partenaire Auto Smart (page
// our-vehicles de chaniacarrental.gr, vérifiée 12/06/2026) : A citadines,
// B compactes, C berlines, D automatiques, E SUV. Pas de scooter/ATV,
// 7 places ni cabriolet chez ce partenaire → retirés de la liste.
// examples = quelques modèles réels du groupe (indicatif, le modèle exact
// dépend de la dispo agence, comme le prix estimé).
export const CAR_TYPES_DATA: CarTypeData[] = [
  { id: "city",      pax: "2-4", labels: { en: "City car", fr: "Citadine", de: "Kleinwagen", el: "Μικρό" },
    examples: ["Toyota Aygo", "Citroën C1", "DS 3"], photo: "/images/cars/city.jpg" },
  { id: "compact",   pax: "4-5", labels: { en: "Compact", fr: "Compacte", de: "Kompakt", el: "Κόμπακτ" },
    examples: ["VW Polo", "Peugeot 208", "Toyota Yaris"], photo: "/images/cars/compact.jpg" },
  { id: "sedan",     pax: "5",   labels: { en: "Sedan", fr: "Berline", de: "Limousine", el: "Σεντάν" },
    examples: ["Toyota Corolla", "Citroën Élysée"], photo: "/images/cars/sedan.jpg" },
  { id: "automatic", pax: "4-5", labels: { en: "Automatic", fr: "Boîte automatique", de: "Automatik", el: "Αυτόματο" },
    examples: ["Toyota C-HR hybride", "Corolla auto", "VW Polo auto"], photo: "/images/cars/automatic.jpg" },
  { id: "suv",       pax: "5",   labels: { en: "SUV", fr: "SUV", de: "SUV", el: "SUV" },
    examples: ["Citroën C3 Aircross"], photo: "/images/cars/suv.jpg" },
];
