import type { CbPlace } from "@/lib/cb-places";
import { cleanCbDescription } from "@/lib/cb-place-helpers";
import { familyOf } from "@/lib/bento-tiles";
import { HeritageBento } from "./HeritageBento";
import { DefaultBento } from "./DefaultBento";
import { BeachBento } from "./BeachBento";
import { NatureBento } from "./NatureBento";
import { VillageBento } from "./VillageBento";

export function ExploreBento({
  place,
  locale,
  communityAvg = null,
  communityCount = 0,
}: {
  place: CbPlace;
  locale: string;
  communityAvg?: number | null;
  communityCount?: number;
}) {
  const { nearby } = cleanCbDescription(place.description);
  const common = { place, nearby, locale, communityAvg, communityCount };
  switch (familyOf(place.place_type)) {
    case "beach":
      return <BeachBento {...common} />;
    case "heritage":
      return <HeritageBento {...common} />;
    case "nature":
      return <NatureBento {...common} />;
    case "village":
      return <VillageBento {...common} />;
    default:
      return <DefaultBento {...common} />;
  }
}
