import { getTranslations } from "next-intl/server";
import { getHikeBySlug } from "@/lib/hikes";
import { getLocalizedField, type Locale, type Hike } from "@/lib/types";
import { breadcrumbSchema } from "@/lib/schema";
import { Footprints, Mountain, Droplets, MapPin, ChevronLeft, Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const DIFFICULTY_STYLES: Record<Hike["difficulty"], { label: string; classes: string }> = {
  easy: { label: "Easy", classes: "bg-green-100 text-green-700" },
  moderate: { label: "Moderate", classes: "bg-amber-100 text-amber-700" },
  hard: { label: "Hard", classes: "bg-orange-100 text-orange-700" },
  expert: { label: "Expert", classes: "bg-red-100 text-red-700" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const hike = await getHikeBySlug(slug);
  if (!hike) return { title: "Trail not found" };

  const name = getLocalizedField(hike, "name", locale as Locale);
  const desc = getLocalizedField(hike, "description", locale as Locale);
  const title = `${name} - Crete Hiking Trail | Crete Direct`;
  const description = desc?.substring(0, 160) || `${name} hiking trail in Crete. ${hike.distance_km ? `${hike.distance_km} km,` : ""} ${hike.difficulty} difficulty.`;
  const url = `${BASE_URL}/${locale}/hikes/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: hike.image_url ? [{ url: hike.image_url, alt: name }] : [],
    },
  };
}

export default async function HikeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const loc = locale as Locale;

  const hike = await getHikeBySlug(slug);
  if (!hike) notFound();

  const name = getLocalizedField(hike, "name", loc);
  const description = getLocalizedField(hike, "description", loc);
  const diffStyle = DIFFICULTY_STYLES[hike.difficulty];

  const url = `${BASE_URL}/${locale}/hikes/${slug}`;

  const hikeJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name,
    description: description?.substring(0, 300) || undefined,
    url,
    sport: "Hiking",
    additionalProperty: [
      hike.distance_km != null && { "@type": "PropertyValue", name: "Distance", value: `${hike.distance_km} km` },
      hike.duration_hours != null && { "@type": "PropertyValue", name: "Duration", value: `${hike.duration_hours}h` },
      hike.elevation_gain_m != null && { "@type": "PropertyValue", name: "Elevation Gain", value: `${hike.elevation_gain_m} m` },
      { "@type": "PropertyValue", name: "Difficulty", value: hike.difficulty },
    ].filter(Boolean),
    ...(hike.start_latitude != null && hike.start_longitude != null
      ? { geo: { "@type": "GeoCoordinates", latitude: hike.start_latitude, longitude: hike.start_longitude } }
      : {}),
    ...(hike.image_url ? { image: hike.image_url } : {}),
  };

  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Crete Direct", url: `${BASE_URL}/${locale}` },
    {
      name: loc === "fr" ? "Randonnées" : loc === "de" ? "Wanderwege" : loc === "el" ? "Πεζοπορία" : "Hiking Trails",
      url: `${BASE_URL}/${locale}/hikes`,
    },
    { name, url },
  ]);

  return (
    <main className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hikeJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {/* Hero image */}
      {hike.image_url && (
        <div className="relative h-64 md:h-80 bg-aegean">
          <img
            src={hike.image_url}
            alt={name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${diffStyle.classes}`}>
                {diffStyle.label}
              </span>
              <span className="text-white/80 text-sm capitalize">{hike.type}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">{name}</h1>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href={`/${locale}/hikes`}
          className="inline-flex items-center gap-1 text-sm text-aegean hover:underline mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> All trails
        </Link>

        {!hike.image_url && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${diffStyle.classes}`}>
                {diffStyle.label}
              </span>
              <span className="text-text-muted text-sm capitalize">{hike.type}</span>
            </div>
            <h1 className="text-3xl font-bold text-aegean">{name}</h1>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {hike.distance_km != null && (
            <div className="rounded-lg bg-white border border-border p-3 text-center">
              <Footprints className="w-5 h-5 text-aegean mx-auto" />
              <p className="text-xs text-text-muted mt-1">Distance</p>
              <p className="font-semibold text-sm">{hike.distance_km} km</p>
            </div>
          )}
          {hike.elevation_gain_m != null && (
            <div className="rounded-lg bg-white border border-border p-3 text-center">
              <Mountain className="w-5 h-5 text-aegean mx-auto" />
              <p className="text-xs text-text-muted mt-1">Elevation gain</p>
              <p className="font-semibold text-sm">+{hike.elevation_gain_m} m</p>
            </div>
          )}
          {hike.duration_hours != null && (
            <div className="rounded-lg bg-white border border-border p-3 text-center">
              <svg className="w-5 h-5 text-aegean mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
              </svg>
              <p className="text-xs text-text-muted mt-1">Duration</p>
              <p className="font-semibold text-sm">
                {hike.duration_hours < 1
                  ? `${Math.round(hike.duration_hours * 60)} min`
                  : `${hike.duration_hours}h`}
              </p>
            </div>
          )}
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Droplets className="w-5 h-5 text-aegean mx-auto" />
            <p className="text-xs text-text-muted mt-1">Water</p>
            <p className="font-semibold text-sm">{hike.water_available ? "Available" : "Bring own"}</p>
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="mb-8">
            <p className="text-text leading-relaxed">{description}</p>
          </div>
        )}

        {/* Actions row */}
        <div className="flex flex-wrap gap-3 mb-12">
          {hike.start_latitude != null && hike.start_longitude != null && (
            <a
              href={`https://www.google.com/maps?q=${hike.start_latitude},${hike.start_longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-aegean text-white rounded-lg text-sm font-medium hover:bg-aegean-light transition-colors"
            >
              <MapPin className="w-4 h-4" /> Start point on Google Maps
            </a>
          )}
          {hike.gpx_storage_path && (
            <a
              href={hike.gpx_storage_path}
              download
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border text-text rounded-lg text-sm font-medium hover:border-aegean/50 transition-colors"
            >
              <Download className="w-4 h-4" /> Download GPX
            </a>
          )}
        </div>

        {/* Image credit */}
        {hike.image_credit && (
          <p className="text-[10px] text-text-light mt-8">Photo: {hike.image_credit}</p>
        )}
      </div>
    </main>
  );
}
