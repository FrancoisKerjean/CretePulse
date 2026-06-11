import type { ComponentType, SVGProps } from "react";
import { CiCarCity, CiCarCompact, CiCarSuv, CiCarFamily, CiScooter } from "@/components/icons";

export interface CarType {
  id: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  pax: string; // indicatif, affiché font-data
  labels: Record<string, string>; // en/fr/de/el
}

// Flotte générique au lancement — affiner quand Panagoula confirme sa flotte (butoir Kami 19/06/2026).
export const CAR_TYPES: CarType[] = [
  { id: "city",    icon: CiCarCity,    pax: "2-4", labels: { en: "City car", fr: "Citadine", de: "Kleinwagen", el: "Μικρό αυτοκίνητο" } },
  { id: "compact", icon: CiCarCompact, pax: "4-5", labels: { en: "Compact", fr: "Compacte", de: "Kompaktklasse", el: "Κόμπακτ" } },
  { id: "suv",     icon: CiCarSuv,     pax: "5",   labels: { en: "SUV / 4x4", fr: "SUV / 4x4", de: "SUV / 4x4", el: "SUV / 4x4" } },
  { id: "family",  icon: CiCarFamily,  pax: "5-7", labels: { en: "Family / 7 seats", fr: "Familiale / 7 places", de: "Familienauto / 7 Sitze", el: "Οικογενειακό / 7 θέσεις" } },
  { id: "scooter", icon: CiScooter,    pax: "1-2", labels: { en: "Scooter / ATV", fr: "Scooter / quad", de: "Roller / Quad", el: "Σκούτερ / ATV" } },
];
