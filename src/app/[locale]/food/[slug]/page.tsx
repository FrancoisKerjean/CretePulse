import { getFoodBySlug, getNearbyFoodPlaces } from "@/lib/food";
import { getLocalizedField, type Locale } from "@/lib/types";
import { UtensilsCrossed, MapPin, Phone, Globe, ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const FL: Record<string, Record<string, string>> = {
  en: { back: "All restaurants", maps: "Open in Google Maps", findMaps: "Find on Google Maps", more: "More in", website: "Website" },
  fr: { back: "Tous les restaurants", maps: "Ouvrir dans Google Maps", findMaps: "Trouver sur Google Maps", more: "Plus en", website: "Site web" },
  de: { back: "Alle Restaurants", maps: "In Google Maps offnen", findMaps: "Auf Google Maps finden", more: "Mehr in", website: "Webseite" },
  el: { back: "\u038c\u03bb\u03b1 \u03c4\u03b1 \u03b5\u03c3\u03c4\u03b9\u03b1\u03c4\u03cc\u03c1\u03b9\u03b1", maps: "\u0386\u03bd\u03bf\u03b9\u03b3\u03bc\u03b1 \u03c3\u03c4\u03bf Google Maps", findMaps: "\u0395\u03cd\u03c1\u03b5\u03c3\u03b7 \u03c3\u03c4\u03bf Google Maps", more: "\u03a0\u03b5\u03c1\u03b9\u03c3\u03c3\u03cc\u03c4\u03b5\u03c1\u03b1 \u03c3\u03c4\u03b7\u03bd", website: "Website" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const place = await getFoodBySlug(slug);
  if (!place) return { title: "Place not found" };

  const desc = getLocalizedField(place, "description", locale as Locale);
  const title = `${place.name}, Crete - Restaurant Guide | Crete Direct`;
  const description = desc?.substring(0, 160) || `${place.name} - ${place.type} in ${place.region} Crete. ${place.cuisine ? `Cuisine: ${place.cuisine}.` : ""}`;
  const url = `${BASE_URL}/${locale}/food/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: place.image_url ? [{ url: place.image_url, alt: place.name }] : [],
    },
  };
}

const TYPE_COLORS: Record<string, string> = {
  restaurant: "bg-terra-faint text-terra",
  taverna: "bg-olive-faint text-olive",
  cafe: "bg-amber-50 text-amber-700",
  bar: "bg-aegean-faint text-aegean",
  bakery: "bg-orange-50 text-orange-700",
  other: "bg-stone text-text-muted",
};

export default async function FoodDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const loc = locale as Locale;

  const place = await getFoodBySlug(slug);
  if (!place) notFound();

  const nearby = await getNearbyFoodPlaces(place.region, place.slug);
  const description = getLocalizedField(place, "description", loc);
  const fl = FL[locale] || FL.en;

  return (
    <main className="min-h-screen bg-surface">
      {/* Hero image */}
      {place.image_url && (
        <div className="relative h-64 md:h-80 bg-terra-faint">
          <Image
            src={place.image_url}
            alt={place.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white">{place.name}</h1>
            <div className="flex items-center gap-2 text-white/80 text-sm mt-1">
              <MapPin className="w-4 h-4" />
              <span className="capitalize">{place.region} Crete</span>
              {place.cuisine && <span>· {place.cuisine}</span>}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href={`/${locale}/food`}
          className="inline-flex items-center gap-1 text-sm text-aegean hover:underline mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> {fl.back}
        </Link>

        {!place.image_url && (
          <>
            <div className="flex items-center gap-3 mb-1">
              <UtensilsCrossed className="w-6 h-6 text-terra" />
              <h1 className="text-3xl font-bold text-aegean">{place.name}</h1>
            </div>
            <div className="flex items-center gap-2 text-text-muted text-sm mb-6">
              <MapPin className="w-4 h-4" />
              <span className="capitalize">{place.region} Crete</span>
              {place.cuisine && <span>· {place.cuisine}</span>}
            </div>
          </>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <UtensilsCrossed className="w-5 h-5 text-terra mx-auto" />
            <p className="text-xs text-text-muted mt-1">Type</p>
            <p className={`font-semibold text-sm capitalize mt-1 inline-block px-2 py-0.5 rounded-full ${TYPE_COLORS[place.type] || TYPE_COLORS.other}`}>
              {place.type}
            </p>
          </div>
          {place.cuisine && (
            <div className="rounded-lg bg-white border border-border p-3 text-center">
              <p className="text-lg">🍽️</p>
              <p className="text-xs text-text-muted mt-1">Cuisine</p>
              <p className="font-semibold text-sm">{place.cuisine}</p>
            </div>
          )}
          {place.price_range && (
            <div className="rounded-lg bg-white border border-border p-3 text-center">
              <p className="text-lg">💶</p>
              <p className="text-xs text-text-muted mt-1">Price</p>
              <p className="font-semibold text-sm">
                {place.price_range === "budget" ? "€ Budget" : place.price_range === "mid" ? "€€ Mid-range" : "€€€ Upscale"}
              </p>
            </div>
          )}
          {place.open_season && (
            <div className="rounded-lg bg-white border border-border p-3 text-center">
              <p className="text-lg">📅</p>
              <p className="text-xs text-text-muted mt-1">Season</p>
              <p className="font-semibold text-sm">{place.open_season}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <div className="prose prose-sm max-w-none mb-8">
            <p className="text-text leading-relaxed">{description}</p>
          </div>
        )}

        {/* Contact & links */}
        <div className="flex flex-wrap gap-3 mb-12">
          {place.phone && (
            <a
              href={`tel:${place.phone}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border text-text rounded-lg text-sm font-medium hover:border-terra/40 transition-colors"
            >
              <Phone className="w-4 h-4 text-terra" /> {place.phone}
            </a>
          )}
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border text-text rounded-lg text-sm font-medium hover:border-terra/40 transition-colors"
            >
              <Globe className="w-4 h-4 text-aegean" /> {fl.website}
            </a>
          )}
          {place.latitude && place.longitude && (
            <a
              href={`https://www.google.com/maps?q=${place.latitude},${place.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-terra text-white rounded-lg text-sm font-medium hover:bg-terra/90 transition-colors"
            >
              <MapPin className="w-4 h-4" /> {fl.maps}
            </a>
          )}
          {place.address && !place.latitude && (
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(place.address + " Crete Greece")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-terra text-white rounded-lg text-sm font-medium hover:bg-terra/90 transition-colors"
            >
              <MapPin className="w-4 h-4" /> {fl.findMaps}
            </a>
          )}
        </div>

        {/* Address */}
        {place.address && (
          <p className="text-sm text-text-muted mb-8 flex items-start gap-2">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-terra" />
            {place.address}
          </p>
        )}

        {/* Nearby places */}
        {nearby.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-aegean mb-4">
              {fl.more} {place.region} Crete
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {nearby.map((p) => (
                <Link
                  key={p.slug}
                  href={`/${locale}/food/${p.slug}`}
                  className="rounded-xl border border-border bg-white p-3 hover:border-terra/30 transition-all"
                >
                  <p className="font-semibold text-sm">{p.name}</p>
                  <p className="text-xs text-text-muted capitalize mt-0.5">
                    {p.type}
                    {p.cuisine ? ` · ${p.cuisine}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Image credit */}
        {place.image_credit && (
          <p className="text-[10px] text-text-light mt-8">Photo: {place.image_credit}</p>
        )}
      </div>
    </main>
  );
}
