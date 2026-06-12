import type { ComponentType, SVGProps } from "react";
import { CiCarCity, CiCarCompact, CiCarSedan, CiCarAuto, CiCarSuv } from "@/components/icons";

export interface CarType {
  id: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  pax: string; // indicatif, affiché font-data
  labels: Record<string, string>; // en/fr/de/el
}

// Flotte calquée sur les groupes réels du partenaire Auto Smart (page
// our-vehicles de chaniacarrental.gr, vérifiée 12/06/2026) :
// A citadines (C1, Aygo X), B compactes (C3, Yaris, Polo), C berlines
// (Elysée, Corolla), D automatiques (Yaris Auto, C-HR Hybrid), E SUV
// (C3 Aircross). Pas de scooter/ATV, 7 places ni cabriolet chez ce
// partenaire → retirés de la liste (icônes conservées dans icons.tsx
// pour de futurs partenaires).
export const CAR_TYPES: CarType[] = [
  { id: "city",      icon: CiCarCity,    pax: "2-4", labels: { en: "City car", fr: "Citadine", de: "Kleinwagen", el: "Μικρό" } },
  { id: "compact",   icon: CiCarCompact, pax: "4-5", labels: { en: "Compact", fr: "Compacte", de: "Kompakt", el: "Κόμπακτ" } },
  { id: "sedan",     icon: CiCarSedan,   pax: "5",   labels: { en: "Sedan", fr: "Berline", de: "Limousine", el: "Σεντάν" } },
  { id: "automatic", icon: CiCarAuto,    pax: "4-5", labels: { en: "Automatic", fr: "Boîte automatique", de: "Automatik", el: "Αυτόματο" } },
  { id: "suv",       icon: CiCarSuv,     pax: "5",   labels: { en: "SUV", fr: "SUV", de: "SUV", el: "SUV" } },
];
