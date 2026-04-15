import { getTranslations } from "next-intl/server";
import { getAllHikes } from "@/lib/hikes";
import { getLocalizedField, type Locale, type Hike } from "@/lib/types";
import { Footprints, Mountain, MapPin } from "lucide-react";
import Link from "next/link";
import { buildAlternates } from "@/lib/seo";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: { title: "Hiking Trails in Crete - Gorges, Mountains & Coasts", desc: "80+ hiking trails in Crete rated by difficulty. Samaria Gorge, Imbros, coastal paths and mountain routes. Distance, elevation and duration for each trail." },
  fr: { title: "Randonnées en Crète - Gorges, Montagnes & Sentiers", desc: "80+ sentiers de randonnée en Crète notés par difficulté. Gorge de Samaria, Imbros, sentiers côtiers. Distance, dénivelé et durée pour chaque trail." },
  de: { title: "Wanderwege auf Kreta - Schluchten, Berge & Küste", desc: "80+ Wanderwege auf Kreta nach Schwierigkeit bewertet. Samaria-Schlucht, Imbros, Küstenpfade. Distanz, Höhenprofil und Dauer." },
  el: { title: "Μονοπάτια Πεζοπορίας στην Κρήτη - Φαράγγια & Βουνά", desc: "80+ μονοπάτια πεζοπορίας στην Κρήτη κατά δυσκολία. Φαράγγι Σαμαριάς, Ιμπρος, παράκτια μονοπάτια. Απόσταση και υψόμετρο." },
};

const DIFFICULTY_STYLES: Record<Hike["difficulty"], { label: string; classes: string }> = {
  easy: { label: "Easy", classes: "bg-green-100 text-green-700" },
  moderate: { label: "Moderate", classes: "bg-amber-100 text-amber-700" },
  hard: { label: "Hard", classes: "bg-orange-100 text-orange-700" },
  expert: { label: "Expert", classes: "bg-red-100 text-red-700" },
};

const DIFFICULTIES: Hike["difficulty"][] = ["easy", "moderate", "hard", "expert"];
const TYPES: Hike["type"][] = ["gorge", "coastal", "mountain", "cultural"];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const m = META[locale] || META.en;
  const url = `${BASE_URL}/${locale}/hikes`;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/hikes"),
    openGraph: { title: m.title, description: m.desc, url, type: "website" },
  };
}

export default async function HikesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ difficulty?: string; type?: string }>;
}) {
  const { locale } = await params;
  const { difficulty, type } = await searchParams;
  const loc = locale as Locale;

  let hikes: Hike[] = [];
  try {
    hikes = await getAllHikes();
  } catch {
    hikes = [];
  }

  if (hikes.length === 0) {
    return <HikesPlaceholder locale={loc} />;
  }

  // Apply filters
  const filtered = hikes.filter((h) => {
    if (difficulty && h.difficulty !== difficulty) return false;
    if (type && h.type !== type) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Mountain className="w-7 h-7 text-aegean" />
          <h1 className="text-3xl font-bold text-aegean">
            {META[locale]?.title || META.en.title}
          </h1>
        </div>
        <p className="text-text-muted mt-1 mb-8">
          {filtered.length} trail{filtered.length !== 1 ? "s" : ""} found
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {/* Difficulty filter */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Difficulty:</span>
            <Link
              href={`/${locale}/hikes${type ? `?type=${type}` : ""}`}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${!difficulty ? "bg-aegean text-white border-aegean" : "border-border text-text-muted hover:border-aegean/50"}`}
            >
              All
            </Link>
            {DIFFICULTIES.map((d) => {
              const style = DIFFICULTY_STYLES[d];
              const isActive = difficulty === d;
              const href = `/${locale}/hikes?difficulty=${d}${type ? `&type=${type}` : ""}`;
              return (
                <Link
                  key={d}
                  href={href}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${isActive ? style.classes + " border-transparent font-semibold" : "border-border text-text-muted hover:border-aegean/50"}`}
                >
                  {style.label}
                </Link>
              );
            })}
          </div>

          {/* Type filter */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Type:</span>
            <Link
              href={`/${locale}/hikes${difficulty ? `?difficulty=${difficulty}` : ""}`}
              className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${!type ? "bg-aegean text-white border-aegean" : "border-border text-text-muted hover:border-aegean/50"}`}
            >
              All
            </Link>
            {TYPES.map((t) => {
              const isActive = type === t;
              const href = `/${locale}/hikes?type=${t}${difficulty ? `&difficulty=${difficulty}` : ""}`;
              return (
                <Link
                  key={t}
                  href={href}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${isActive ? "bg-aegean text-white border-aegean font-semibold" : "border-border text-text-muted hover:border-aegean/50"}`}
                >
                  {t}
                </Link>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <Footprints className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No trails match the selected filters.</p>
            <Link href={`/${locale}/hikes`} className="text-aegean text-sm hover:underline mt-2 inline-block">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((hike) => {
              const diffStyle = DIFFICULTY_STYLES[hike.difficulty];
              return (
                <Link
                  key={hike.slug}
                  href={`/${locale}/hikes/${hike.slug}`}
                  className="group rounded-xl border border-border bg-white overflow-hidden hover:border-aegean/30 hover:shadow-md transition-all"
                >
                  {hike.image_url && (
                    <div className="h-40 bg-aegean-faint overflow-hidden">
                      <img
                        src={hike.image_url}
                        alt={getLocalizedField(hike, "name", loc)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h2 className="font-semibold text-lg leading-tight">
                        {getLocalizedField(hike, "name", loc)}
                      </h2>
                      <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${diffStyle.classes}`}>
                        {diffStyle.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-text-muted mb-3 capitalize">
                      <MapPin className="w-3 h-3" />
                      {hike.type}
                    </div>

                    {/* Stats row */}
                    <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                      {hike.distance_km != null && (
                        <span className="flex items-center gap-1">
                          <Footprints className="w-3 h-3" />
                          {hike.distance_km} km
                        </span>
                      )}
                      {hike.elevation_gain_m != null && (
                        <span className="flex items-center gap-1">
                          <Mountain className="w-3 h-3" />
                          +{hike.elevation_gain_m} m
                        </span>
                      )}
                      {hike.duration_hours != null && (
                        <span>
                          {hike.duration_hours < 1
                            ? `${Math.round(hike.duration_hours * 60)} min`
                            : `${hike.duration_hours}h`}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function HikesPlaceholder({ locale }: { locale: Locale }) {
  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-2">
          <Mountain className="w-7 h-7 text-aegean" />
          <h1 className="text-3xl font-bold text-aegean">
            {META[locale]?.title || META.en.title}
          </h1>
        </div>
        <p className="text-text-muted mt-2 mb-8">Trails data loading soon.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-white p-4 animate-pulse">
              <div className="h-32 bg-stone rounded-lg mb-3" />
              <div className="h-5 bg-stone rounded w-2/3 mb-2" />
              <div className="h-3 bg-stone rounded w-1/3 mb-3" />
              <div className="flex gap-2">
                <div className="h-3 bg-stone rounded w-12" />
                <div className="h-3 bg-stone rounded w-16" />
                <div className="h-3 bg-stone rounded w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
