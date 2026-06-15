import type { CbPlace } from "@/lib/cb-places";
import { cleanCbDescription } from "@/lib/cb-place-helpers";
import { familyOf } from "@/lib/bento-tiles";
import { HeritageBento } from "./HeritageBento";
import { DefaultBento } from "./DefaultBento";
import { BeachBento } from "./BeachBento";
import { NatureBento } from "./NatureBento";
import { VillageBento } from "./VillageBento";

export function ExploreBento({ place, locale }: { place: CbPlace; locale: string }) {
  const { nearby } = cleanCbDescription(place.description);
  switch (familyOf(place.place_type)) {
    case "beach":
      return <BeachBento place={place} nearby={nearby} locale={locale} />;
    case "heritage":
      return <HeritageBento place={place} nearby={nearby} locale={locale} />;
    case "nature":
      return <NatureBento place={place} nearby={nearby} locale={locale} />;
    case "village":
      return <VillageBento place={place} nearby={nearby} locale={locale} />;
    default:
      return <DefaultBento place={place} nearby={nearby} locale={locale} />;
  }
}
