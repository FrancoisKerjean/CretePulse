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
import { RatingTile } from "./shared/RatingTile";
import { LightboxModal } from "@/components/explore/PhotoLightbox";

export function BeachBento({
  place, nearby, locale, communityAvg, communityCount,
}: {
  place: CbPlace;
  nearby: NearbyPlace[];
  locale: string;
  communityAvg?: number | null;
  communityCount?: number;
}) {
  const photos = place.photos ?? [];
  const town = nearestKnownTown(place.latitude, place.longitude);
  const tag = `${typeLabel(place.place_type, locale)}${place.prefecture ? ` · ${place.prefecture}` : ""}`;

  // 6 attributs structurés déjà en base.
  const attrTiles: Array<{ big: string; label: string; variant?: "lagoon" | "sand" | "terra" | "aegean" }> = [];
  if (place.water_color) attrTiles.push({ big: place.water_color, label: bentoLabel("water", locale), variant: "lagoon" });
  if (place.sand_type) attrTiles.push({ big: place.sand_type, label: bentoLabel("sand", locale), variant: "sand" });
  if (place.depth) attrTiles.push({ big: place.depth, label: bentoLabel("depth", locale), variant: "terra" });
  if (place.sea_surface) attrTiles.push({ big: place.sea_surface, label: bentoLabel("sea", locale), variant: "aegean" });
  if (place.crowds) attrTiles.push({ big: place.crowds, label: bentoLabel("crowds", locale) });
  if (place.accessibility) attrTiles.push({ big: place.accessibility, label: bentoLabel("access", locale) });

  return (
    <section className="grid grid-cols-4 gap-2 md:grid-cols-6">
      <HeroCell name={place.name} tag={tag} photo={photos[0]} lightboxIndex={photos[0] ? 0 : undefined} className="col-span-4 row-span-2 min-h-[220px] md:col-span-4" />
      <RatingTile
        slug={place.slug}
        scrapedRating={place.rating ?? null}
        communityAvg={communityAvg ?? null}
        communityCount={communityCount ?? 0}
        locale={locale}
      />
      {town && (
        <Tile big={town.km < 10 ? town.km.toFixed(1) : Math.round(town.km)} label={`km · ${town.name}`} className="col-span-2 md:col-span-1" />
      )}
      {attrTiles.map((a, i) => (
        <Tile key={i} big={a.big} label={a.label} variant={a.variant} className="col-span-2 md:col-span-2" />
      ))}
      <MapCell lat={place.latitude} lng={place.longitude} label={town ? town.name : null} className="col-span-4 h-40 md:col-span-6" />
      {photos[1] && <PhotoCell src={photos[1]} alt={`${place.name} 2`} lightboxIndex={1} className="col-span-2 h-36" />}
      {photos[2] && <PhotoCell src={photos[2]} alt={`${place.name} 3`} lightboxIndex={2} className="col-span-2 h-36" />}
      <NearbyCell nearby={nearby} locale={locale} className="col-span-4 md:col-span-6" />
      {photos.length > 0 && <LightboxModal photos={photos} name={place.name} />}
    </section>
  );
}
