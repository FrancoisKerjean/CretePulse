import { getAllFoodPlaces, getFoodByRegionAndType } from "@/lib/food";
import { getLocalizedField, type Locale } from "@/lib/types";
import { UtensilsCrossed, MapPin } from "lucide-react";
import Link from "next/link";
import { buildAlternates } from "@/lib/seo";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Best Restaurants & Tavernas in Crete",
    desc: "Best restaurants, tavernas, cafes and bakeries across Crete. Local picks by region — east, west, central and south Crete. Authentic Cretan cuisine.",
  },
  fr: {
    title: "Meilleurs Restaurants & Tavernes en Crète",
    desc: "Meilleurs restaurants, tavernes, cafés et boulangeries de Crète. Adresses locales par région. Cuisine crétoise authentique.",
  },
  de: {
    title: "Beste Restaurants & Tavernen auf Kreta",
    desc: "Beste Restaurants, Tavernen, Cafés und Bäckereien auf Kreta. Lokale Empfehlungen nach Region. Authentische kretische Küche.",
  },
  el: {
    title: "Καλύτερα Εστιατόρια & Ταβέρνες στην Κρήτη",
    desc: "Καλύτερα εστιατόρια, ταβέρνες, καφέ και αρτοποιεία στην Κρήτη. Τοπικές επιλογές ανά περιοχή.",
  },
};

const REGION_LABELS: Record<string, Record<string, string>> = {
  east:    { en: "East Crete",    fr: "Crète orientale", de: "Ostkreta",   el: "Ανατολική Κρήτη" },
  west:    { en: "West Crete",    fr: "Crète occidentale", de: "Westkreta", el: "Δυτική Κρήτη" },
  central: { en: "Central Crete", fr: "Crète centrale",  de: "Zentralkreta", el: "Κεντρική Κρήτη" },
  south:   { en: "South Crete",   fr: "Crète du Sud",    de: "Südkreta",   el: "Νότια Κρήτη" },
};

const TYPE_LABELS: Record<string, Record<string, string>> = {
  restaurant: { en: "Restaurant", fr: "Restaurant",    de: "Restaurant",  el: "Εστιατόριο" },
  taverna:    { en: "Taverna",    fr: "Taverne",        de: "Taverne",     el: "Ταβέρνα" },
  cafe:       { en: "Café",       fr: "Café",           de: "Café",        el: "Καφετέρια" },
  bar:        { en: "Bar",        fr: "Bar",            de: "Bar",         el: "Μπαρ" },
  bakery:     { en: "Bakery",     fr: "Boulangerie",    de: "Bäckerei",    el: "Αρτοποιείο" },
  other:      { en: "Other",      fr: "Autre",          de: "Sonstiges",   el: "Άλλο" },
};

const ALL_LABEL: Record<string, string> = {
  en: "All regions", fr: "Toutes les régions", de: "Alle Regionen", el: "Όλες οι περιοχές",
};

const SUBTITLE: Record<string, string> = {
  en: "Local food guide — curated picks from across the island",
  fr: "Guide gastronomique local — sélection de bonnes adresses",
  de: "Lokaler Gastronomieführer — kuratierte Empfehlungen",
  el: "Τοπικός γαστρονομικός οδηγός — επιλεγμένες προτάσεις",
};

// ---------------------------------------------------------------------------
// Visual config
// ---------------------------------------------------------------------------

// Accent bar color per type (left border)
const TYPE_ACCENT: Record<string, string> = {
  restaurant: "border-l-aegean",
  taverna:    "border-l-terra",
  cafe:       "border-l-olive",
  bar:        "border-l-aegean-light",
  bakery:     "border-l-terra-light",
  other:      "border-l-stone-400",
};

// Badge color per type
const TYPE_BADGE: Record<string, string> = {
  restaurant: "bg-aegean-faint text-aegean",
  taverna:    "bg-terra-faint text-terra",
  cafe:       "bg-olive/10 text-olive",
  bar:        "bg-aegean-faint text-aegean-light",
  bakery:     "bg-terra-faint text-terra-light",
  other:      "bg-stone text-text-muted",
};

const PRICE_SYMBOL: Record<string, string> = {
  budget: "€",
  mid: "€€",
  upscale: "€€€",
};

const REGIONS = ["east", "west", "central", "south"] as const;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const m = META[locale] || META.en;
  const url = `${BASE_URL}/${locale}/food`;
  return {
    title: `${m.title} | Crete Direct`,
    description: m.desc,
    alternates: buildAlternates(locale, "/food"),
    openGraph: { title: m.title, description: m.desc, url, type: "website" },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function FoodPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ region?: string; type?: string }>;
}) {
  const { locale } = await params;
  const { region: regionParam, type: typeParam } = await searchParams;
  const loc = locale as Locale;

  const activeRegion = REGIONS.includes(regionParam as (typeof REGIONS)[number])
    ? (regionParam as (typeof REGIONS)[number])
    : undefined;

  // Fetch data — filtered when a region is active, otherwise curated overview
  let places: Awaited<ReturnType<typeof getAllFoodPlaces>> = [];
  try {
    if (activeRegion || typeParam) {
      places = await getFoodByRegionAndType(activeRegion, typeParam, 30);
    } else {
      places = await getAllFoodPlaces();
    }
  } catch {
    places = [];
  }

  // Strip entries with no cuisine AND no description (low quality)
  places = places.filter((p) => {
    const hasDesc = !!(
      p.description_en ||
      p.description_fr ||
      p.description_de ||
      p.description_el
    );
    return p.cuisine || hasDesc;
  });

  const title = META[loc]?.title || META.en.title;
  const subtitle = SUBTITLE[loc] || SUBTITLE.en;
  const allLabel = ALL_LABEL[loc] || ALL_LABEL.en;

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <UtensilsCrossed className="w-7 h-7 text-terra shrink-0" />
          <h1 className="text-3xl font-bold text-aegean">{title}</h1>
        </div>
        <p className="text-text-muted mt-1 mb-8 ml-10">{subtitle}</p>

        {/* Region tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <RegionTab
            href={`/${locale}/food${typeParam ? `?type=${typeParam}` : ""}`}
            label={allLabel}
            active={!activeRegion}
          />
          {REGIONS.map((r) => {
            const regionCount = places.filter((p) => p.region === r).length;
            if (regionCount === 0) return null;
            const href = `/${locale}/food?region=${r}${typeParam ? `&type=${typeParam}` : ""}`;
            return (
              <RegionTab
                key={r}
                href={href}
                label={REGION_LABELS[r]?.[loc] || REGION_LABELS[r]?.en || r}
                active={activeRegion === r}
                count={!activeRegion ? regionCount : undefined}
              />
            );
          })}
        </div>

        {places.length === 0 ? (
          <EmptyState locale={loc} />
        ) : activeRegion ? (
          /* Single region view — grouped by type */
          <RegionSection
            places={places}
            region={activeRegion}
            locale={loc}
            activeType={typeParam}
          />
        ) : (
          /* Overview — one section per region that has results */
          <div className="space-y-12">
            {REGIONS.map((r) => {
              const regionPlaces = places.filter((p) => p.region === r);
              if (regionPlaces.length === 0) return null;
              return (
                <div key={r}>
                  <div className="flex items-baseline justify-between mb-4">
                    <h2 className="text-xl font-semibold text-aegean">
                      {REGION_LABELS[r]?.[loc] || REGION_LABELS[r]?.en || r}
                    </h2>
                    {regionPlaces.length >= 8 && (
                      <Link
                        href={`/${locale}/food?region=${r}`}
                        className="text-sm text-terra hover:underline"
                      >
                        {loc === "fr"
                          ? "Voir tout"
                          : loc === "de"
                          ? "Alle anzeigen"
                          : loc === "el"
                          ? "Δείτε όλα"
                          : "See all"}
                      </Link>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {regionPlaces.slice(0, 6).map((place) => (
                      <FoodCard key={place.slug} place={place} locale={loc} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Region section (grouped by type)
// ---------------------------------------------------------------------------

function RegionSection({
  places,
  region,
  locale,
  activeType,
}: {
  places: Awaited<ReturnType<typeof getAllFoodPlaces>>;
  region: string;
  locale: Locale;
  activeType?: string;
}) {
  const types = ["restaurant", "taverna", "cafe", "bar", "bakery", "other"] as const;

  // If a type filter is active just show a flat grid
  if (activeType) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {places.map((place) => (
          <FoodCard key={place.slug} place={place} locale={locale} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {types.map((t) => {
        const group = places.filter((p) => p.type === t);
        if (group.length === 0) return null;
        const typeLabel =
          TYPE_LABELS[t]?.[locale] || TYPE_LABELS[t]?.en || t;
        return (
          <div key={t}>
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${TYPE_BADGE[t] || TYPE_BADGE.other}`}
              >
                {typeLabel}
              </span>
              <span className="text-text-muted text-sm">({group.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.map((place) => (
                <FoodCard key={place.slug} place={place} locale={locale} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function FoodCard({
  place,
  locale,
}: {
  place: Awaited<ReturnType<typeof getAllFoodPlaces>>[number];
  locale: Locale;
}) {
  const description = getLocalizedField(place, "description", locale);
  const typeLabel =
    TYPE_LABELS[place.type]?.[locale] ||
    TYPE_LABELS[place.type]?.en ||
    place.type;
  const accent = TYPE_ACCENT[place.type] || "border-l-stone-400";
  const badge = TYPE_BADGE[place.type] || TYPE_BADGE.other;

  return (
    <Link
      href={`/${locale}/food/${place.slug}`}
      className={`group flex flex-col rounded-xl border border-border border-l-4 ${accent} bg-white overflow-hidden hover:shadow-md hover:border-opacity-60 transition-all duration-200`}
    >
      {place.image_url && (
        <div className="h-40 bg-terra-faint overflow-hidden shrink-0">
          <img
            src={place.image_url}
            alt={place.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Name + type badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base leading-snug text-text group-hover:text-aegean transition-colors">
            {place.name}
          </h3>
          <span
            className={`shrink-0 text-xs px-2 py-0.5 rounded-full capitalize font-medium ${badge}`}
          >
            {typeLabel}
          </span>
        </div>

        {/* Region + cuisine */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="capitalize">
              {REGION_LABELS[place.region]?.[locale] ||
                REGION_LABELS[place.region]?.en ||
                place.region}
            </span>
          </span>
          {place.cuisine && (
            <span className="flex flex-wrap gap-1">
              {place.cuisine.split(";").filter(Boolean).slice(0, 3).map((c: string) => (
                <span key={c} className="px-1.5 py-0.5 bg-stone rounded text-[10px] capitalize">
                  {c.trim().replace(/_/g, " ")}
                </span>
              ))}
            </span>
          )}
          {place.price_range && (
            <>
              <span aria-hidden>·</span>
              <span className="font-medium text-terra">
                {PRICE_SYMBOL[place.price_range] || place.price_range}
              </span>
            </>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-text-muted line-clamp-2 mt-auto pt-1">
            {description}
          </p>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Region tab
// ---------------------------------------------------------------------------

function RegionTab({
  href,
  label,
  active,
  count,
}: {
  href: string;
  label: string;
  active: boolean;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-aegean text-white border-aegean"
          : "bg-white text-text-muted border-border hover:border-aegean hover:text-aegean"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-1.5 text-xs ${active ? "text-white/70" : "text-text-muted"}`}>
          ({count})
        </span>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ locale }: { locale: Locale }) {
  const msgs: Record<Locale, string> = {
    en: "No results for this filter. Try another region.",
    fr: "Aucun résultat pour ce filtre. Essayez une autre région.",
    de: "Keine Ergebnisse für diesen Filter. Versuchen Sie eine andere Region.",
    el: "Δεν βρέθηκαν αποτελέσματα. Δοκιμάστε άλλη περιοχή.",
  };
  return (
    <div className="py-20 text-center text-text-muted">
      <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 text-stone-300" />
      <p>{msgs[locale] || msgs.en}</p>
    </div>
  );
}
