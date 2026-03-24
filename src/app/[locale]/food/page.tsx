import { getAllFoodPlaces } from "@/lib/food";
import { getLocalizedField, type Locale } from "@/lib/types";
import { UtensilsCrossed, MapPin } from "lucide-react";
import Link from "next/link";

const META: Record<string, { title: string; desc: string }> = {
  en: { title: "Food & Restaurants in Crete", desc: "Best restaurants, tavernas and cafes in Crete" },
  fr: { title: "Restaurants en Crète", desc: "Les meilleurs restaurants, tavernes et cafés de Crète" },
  de: { title: "Restaurants auf Kreta", desc: "Die besten Restaurants, Tavernen und Cafés auf Kreta" },
  el: { title: "Εστιατόρια στην Κρήτη", desc: "Τα καλύτερα εστιατόρια, ταβέρνες και καφέ στην Κρήτη" },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const m = META[locale] || META.en;
  return { title: m.title, description: m.desc };
}

const TYPE_COLORS: Record<string, string> = {
  restaurant: "bg-terra-faint text-terra",
  taverna: "bg-olive-faint text-olive",
  cafe: "bg-amber-50 text-amber-700",
  bar: "bg-aegean-faint text-aegean",
  bakery: "bg-orange-50 text-orange-700",
  other: "bg-stone text-text-muted",
};

const REGIONS = ["east", "west", "central", "south"] as const;
const TYPES = ["restaurant", "taverna", "cafe", "bar", "bakery"] as const;

export default async function FoodPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;

  let places: Awaited<ReturnType<typeof getAllFoodPlaces>> = [];
  try {
    places = await getAllFoodPlaces();
  } catch {
    places = [];
  }

  if (places.length === 0) {
    return <FoodPlaceholder locale={loc} />;
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-2">
          <UtensilsCrossed className="w-7 h-7 text-terra" />
          <h1 className="text-3xl font-bold text-aegean">
            {META[loc]?.title || META.en.title}
          </h1>
        </div>
        <p className="text-text-muted mt-1 mb-8">
          {places.length} places to eat and drink across Crete
        </p>

        {/* Filter hints - rendered as static badges for now */}
        <div className="flex flex-wrap gap-2 mb-6">
          {REGIONS.map((r) => {
            const count = places.filter((p) => p.region === r).length;
            if (count === 0) return null;
            return (
              <span
                key={r}
                className="text-xs px-3 py-1 rounded-full bg-aegean-faint text-aegean capitalize"
              >
                {r} ({count})
              </span>
            );
          })}
          {TYPES.map((t) => {
            const count = places.filter((p) => p.type === t).length;
            if (count === 0) return null;
            return (
              <span
                key={t}
                className={`text-xs px-3 py-1 rounded-full capitalize ${TYPE_COLORS[t] || TYPE_COLORS.other}`}
              >
                {t} ({count})
              </span>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {places.map((place) => {
            const description = getLocalizedField(place, "description", loc);
            return (
              <Link
                key={place.slug}
                href={`/${locale}/food/${place.slug}`}
                className="group rounded-xl border border-border bg-white overflow-hidden hover:border-terra/30 hover:shadow-md transition-all"
              >
                {place.image_url && (
                  <div className="h-40 bg-terra-faint overflow-hidden">
                    <img
                      src={place.image_url}
                      alt={place.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-lg leading-snug">{place.name}</h2>
                    <span
                      className={`shrink-0 text-xs px-2 py-0.5 rounded-full capitalize ${TYPE_COLORS[place.type] || TYPE_COLORS.other}`}
                    >
                      {place.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                    <MapPin className="w-3 h-3" />
                    <span className="capitalize">{place.region} Crete</span>
                    {place.cuisine && (
                      <>
                        <span className="mx-1">·</span>
                        <span>{place.cuisine}</span>
                      </>
                    )}
                  </div>
                  {description && (
                    <p className="text-sm text-text-muted mt-2 line-clamp-2">{description}</p>
                  )}
                  {place.price_range && (
                    <div className="mt-3">
                      <span className="text-xs bg-stone text-text-muted px-2 py-0.5 rounded-full">
                        {place.price_range === "budget" ? "€" : place.price_range === "mid" ? "€€" : "€€€"}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function FoodPlaceholder({ locale }: { locale: Locale }) {
  const titles: Record<Locale, string> = {
    en: "Food & Restaurants in Crete",
    fr: "Restaurants en Crète",
    de: "Restaurants auf Kreta",
    el: "Εστιατόρια στην Κρήτη",
  };

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-2">
          <UtensilsCrossed className="w-7 h-7 text-terra" />
          <h1 className="text-3xl font-bold text-aegean">{titles[locale]}</h1>
        </div>
        <p className="text-text-muted mt-1 mb-8">
          Restaurants, tavernas and cafes — data being loaded.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-white p-4 animate-pulse">
              <div className="h-32 bg-stone rounded-lg mb-3" />
              <div className="h-5 bg-stone rounded w-2/3 mb-2" />
              <div className="h-3 bg-stone rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
