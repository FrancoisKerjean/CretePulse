import type { CbPlace } from "@/lib/cb-places";
import type { NearbyPlace } from "@/lib/cb-place-helpers";
import { typeLabel } from "@/lib/cb-type-labels";
import { nearestKnownTown } from "@/lib/crete-towns";
import { bentoLabel } from "@/lib/bento-labels";
import { HeroCell } from "./shared/HeroCell";
import { Tile } from "./shared/Tile";
import { MapCell } from "./shared/MapCell";
import { PhotoCell } from "./shared/PhotoCell";
import { NearbyCell } from "./shared/NearbyCell";
import { DetailCell } from "./shared/DetailCell";
import { RatingTile } from "./shared/RatingTile";

export function VillageBento({
  place, nearby, locale, communityAvg, communityCount,
}: {
  place: CbPlace;
  nearby: NearbyPlace[];
  locale: string;
  communityAvg?: number | null;
  communityCount?: number;
}) {
  const t = place.bento_tiles ?? {};
  const photos = place.photos ?? [];
  const town = nearestKnownTown(place.latitude, place.longitude);
  const tag = `${typeLabel(place.place_type, locale)}${place.prefecture ? ` · ${place.prefecture}` : ""}`;

  return (
    <section className="grid grid-cols-4 gap-2 md:grid-cols-6">
      <HeroCell name={place.name} tag={tag} photo={photos[0]} className="col-span-4 row-span-2 min-h-[220px] md:col-span-4" />
      <RatingTile
        slug={place.slug}
        scrapedRating={place.rating ?? null}
        communityAvg={communityAvg ?? null}
        communityCount={communityCount ?? 0}
        locale={locale}
      />
      {t.population != null && (
        <Tile variant="aegean" icon="🏘️" big={t.population.toLocaleString(locale)} label={bentoLabel("population", locale)} className="col-span-2 md:col-span-1" />
      )}
      {t.altitude_m != null && (
        <Tile variant="lagoon" icon="⛰️" big={`${t.altitude_m}m`} label={bentoLabel("altitude", locale)} className="col-span-2 md:col-span-1" />
      )}
      {town && (
        <Tile big={town.km < 10 ? town.km.toFixed(1) : Math.round(town.km)} label={`km · ${town.name}`} className="col-span-2 md:col-span-1" />
      )}
      <MapCell lat={place.latitude} lng={place.longitude} label={town ? town.name : null} className="col-span-4 h-40 md:col-span-6" />
      {photos[1] && <PhotoCell src={photos[1]} alt={`${place.name} 2`} className="col-span-2 h-36" />}
      {t.specialty ? (
        <DetailCell eyebrow={bentoLabel("rare", locale)} text={t.specialty} className="col-span-2 h-36" />
      ) : (
        photos[2] && <PhotoCell src={photos[2]} alt={`${place.name} 3`} className="col-span-2 h-36" />
      )}
      <NearbyCell nearby={nearby} locale={locale} className="col-span-4 md:col-span-6" />
    </section>
  );
}
