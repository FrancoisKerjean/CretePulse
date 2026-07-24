import type { ComponentType, SVGProps } from "react";
import { CiCarCity, CiCarCompact, CiCarSedan, CiCarAuto, CiCarSuv } from "@/components/icons";
import { CAR_TYPES_DATA, type CarTypeData } from "./car-types-data";

export type { CarTypeData };

export interface CarType extends CarTypeData {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

// Données pures dans car-types-data.ts ; ici on recompose avec les icônes maison.
// Icônes Cabriolet/scooter/7 places conservées dans icons.tsx pour de futurs
// partenaires, mais hors flotte Auto Smart donc absentes de CAR_TYPES.
const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  city: CiCarCity,
  compact: CiCarCompact,
  sedan: CiCarSedan,
  automatic: CiCarAuto,
  suv: CiCarSuv,
};

export const CAR_TYPES: CarType[] = CAR_TYPES_DATA.map((d) => ({ ...d, icon: ICONS[d.id] }));
