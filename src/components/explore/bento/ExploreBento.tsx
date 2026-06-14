import type { CbPlace } from "@/lib/cb-places";
import { cleanCbDescription } from "@/lib/cb-place-helpers";
import { familyOf } from "@/lib/bento-tiles";
import { HeritageBento } from "./HeritageBento";
import { DefaultBento } from "./DefaultBento";

export function ExploreBento({ place, locale }: { place: CbPlace; locale: string }) {
  const { nearby } = cleanCbDescription(place.description);
  switch (familyOf(place.place_type)) {
    case "heritage":
      return <HeritageBento place={place} nearby={nearby} locale={locale} />;
    // beach/nature/village ajoutés en IMPL-5 ; fallback fail-safe en attendant.
    default:
      return <DefaultBento place={place} nearby={nearby} locale={locale} />;
  }
}
