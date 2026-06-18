import type { CbPlace } from "@/lib/cb-places";
import type { NearbyPlace } from "@/lib/cb-place-helpers";
import { typeLabel } from "@/lib/cb-type-labels";
import { toRoman } from "@/lib/crete-geo";
import { nearestKnownTown } from "@/lib/crete-towns";
import { bentoLabel } from "@/lib/bento-labels";
import { HeroCell } from "./shared/HeroCell";
import { Tile } from "./shared/Tile";
import { MapCell } from "./shared/MapCell";
import { PhotoCell } from "./shared/PhotoCell";
import { NearbyCell } from "./shared/NearbyCell";
import { DetailCell } from "./shared/DetailCell";
import { RatingTile } from "./shared/RatingTile";
import { LightboxModal } from "@/components/explore/PhotoLightbox";

export function HeritageBento({
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
      <HeroCell name={place.name} tag={tag} photo={photos[0]} lightboxIndex={photos[0] ? 0 : undefined} className="col-span-4 row-span-2 min-h-[220px] md:col-span-4" />

      <RatingTile
        slug={place.slug}
        scrapedRating={place.rating ?? null}
        communityAvg={communityAvg ?? null}
        communityCount={communityCount ?? 0}
        locale={locale}
      />
      {t.century != null && (
        <Tile variant="aegean" icon="⛪" big={toRoman(t.century)} label={bentoLabel("century", locale)} className="col-span-2 md:col-span-1" />
      )}
      {t.frescoes_date && (
        <Tile variant="terra" icon="🎨" big={t.frescoes_date} label={bentoLabel("frescoes", locale)} className="col-span-2 md:col-span-1" />
      )}
      {town && (
        <Tile big={town.km < 10 ? town.km.toFixed(1) : Math.round(town.km)} label={`km · ${town.name}`} className="col-span-2 md:col-span-1" />
      )}
      {t.walking_minutes != null && (
        <Tile variant="lagoon" icon="🚶" big={`${t.walking_minutes}'`} label={bentoLabel("walk", locale)} className="col-span-2 md:col-span-1" />
      )}

      <MapCell lat={place.latitude} lng={place.longitude} label={town ? `${town.name}` : null} className="col-span-4 h-40 md:col-span-6" />

      {photos[1] && <PhotoCell src={photos[1]} alt={`${place.name} 2`} lightboxIndex={1} className="col-span-2 h-36" />}
      {t.unique_feature ? (
        <DetailCell eyebrow={bentoLabel("rare", locale)} text={t.unique_feature} className="col-span-2 h-36" />
      ) : (
        photos[2] && <PhotoCell src={photos[2]} alt={`${place.name} 3`} lightboxIndex={2} className="col-span-2 h-36" />
      )}

      <NearbyCell nearby={nearby} locale={locale} className="col-span-4 md:col-span-6" />
      {photos.length > 0 && <LightboxModal photos={photos} name={place.name} />}
    </section>
  );
}
