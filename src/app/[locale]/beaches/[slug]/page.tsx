import { getTranslations } from "next-intl/server";
import { getBeachBySlug, getNearbyBeaches } from "@/lib/beaches";
import { getLocalizedField, type Locale } from "@/lib/types";
import { MapPin, Car, Waves, Fish, Sun, Wind, Baby, UtensilsCrossed, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const beach = await getBeachBySlug(slug);
  if (!beach) return { title: "Beach not found" };

  const name = getLocalizedField(beach, "name", locale as Locale);
  const desc = getLocalizedField(beach, "description", locale as Locale);

  return {
    title: `${name} - Crete Beach`,
    description: desc?.substring(0, 160) || `${name} beach in Crete, Greece`,
  };
}

export default async function BeachDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const loc = locale as Locale;

  const beach = await getBeachBySlug(slug);
  if (!beach) notFound();

  const nearby = await getNearbyBeaches(beach.latitude, beach.longitude, beach.slug);
  const name = getLocalizedField(beach, "name", loc);
  const description = getLocalizedField(beach, "description", loc);

  return (
    <main className="min-h-screen bg-surface">
      {/* Hero image */}
      {beach.image_url && (
        <div className="relative h-64 md:h-80 bg-aegean">
          <img
            src={beach.image_url}
            alt={name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white">{name}</h1>
            <div className="flex items-center gap-2 text-white/80 text-sm mt-1">
              <MapPin className="w-4 h-4" />
              {beach.region} Crete
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href={`/${locale}/beaches`}
          className="inline-flex items-center gap-1 text-sm text-aegean hover:underline mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> All beaches
        </Link>

        {!beach.image_url && (
          <h1 className="text-3xl font-bold text-aegean mb-2">{name}</h1>
        )}

        {/* Attributes grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Waves className="w-5 h-5 text-aegean mx-auto" />
            <p className="text-xs text-text-muted mt-1">Type</p>
            <p className="font-semibold text-sm capitalize">{beach.type || "Mixed"}</p>
          </div>
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Wind className="w-5 h-5 text-aegean mx-auto" />
            <p className="text-xs text-text-muted mt-1">Wind exposure</p>
            <p className="font-semibold text-sm capitalize">{beach.wind_exposure || "Moderate"}</p>
          </div>
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Car className="w-5 h-5 text-aegean mx-auto" />
            <p className="text-xs text-text-muted mt-1">Parking</p>
            <p className="font-semibold text-sm">{beach.parking ? "Yes" : "No"}</p>
          </div>
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Baby className="w-5 h-5 text-terra mx-auto" />
            <p className="text-xs text-text-muted mt-1">Kids</p>
            <p className="font-semibold text-sm">{beach.kids_friendly ? "Friendly" : "Not ideal"}</p>
          </div>
        </div>

        {/* Facilities */}
        <div className="flex flex-wrap gap-2 mb-8">
          {beach.sunbeds && (
            <span className="inline-flex items-center gap-1 text-sm bg-stone px-3 py-1 rounded-full">
              <Sun className="w-4 h-4 text-amber-500" /> Sunbeds
            </span>
          )}
          {beach.taverna && (
            <span className="inline-flex items-center gap-1 text-sm bg-stone px-3 py-1 rounded-full">
              <UtensilsCrossed className="w-4 h-4 text-terra" /> Taverna
            </span>
          )}
          {beach.snorkeling && (
            <span className="inline-flex items-center gap-1 text-sm bg-stone px-3 py-1 rounded-full">
              <Fish className="w-4 h-4 text-aegean" /> Snorkeling
            </span>
          )}
        </div>

        {/* Description */}
        {description && (
          <div className="prose prose-sm max-w-none mb-8">
            <p className="text-text leading-relaxed">{description}</p>
          </div>
        )}

        {/* Map link */}
        <a
          href={`https://www.google.com/maps?q=${beach.latitude},${beach.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-aegean text-white rounded-lg text-sm font-medium hover:bg-aegean-light transition-colors mb-12"
        >
          <MapPin className="w-4 h-4" /> Open in Google Maps
        </a>

        {/* Nearby beaches */}
        {nearby.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-aegean mb-4">Nearby beaches</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {nearby.map((b) => (
                <Link
                  key={b.slug}
                  href={`/${locale}/beaches/${b.slug}`}
                  className="rounded-xl border border-border bg-white p-3 hover:border-aegean/30 transition-all"
                >
                  <p className="font-semibold text-sm">{getLocalizedField(b, "name", loc)}</p>
                  <p className="text-xs text-text-muted capitalize">{b.type} - {b.region}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Image credit */}
        {beach.image_credit && (
          <p className="text-[10px] text-text-light mt-8">Photo: {beach.image_credit}</p>
        )}
      </div>
    </main>
  );
}
