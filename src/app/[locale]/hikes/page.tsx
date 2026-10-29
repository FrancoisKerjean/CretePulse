import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getAllHikes, HIKES_PUBLISHED } from "@/lib/hikes";
import { getLocalizedField, type Locale, type Hike } from "@/lib/types";
import { Footprints, Mountain, MapPin } from "lucide-react";
import Link from "next/link";
import { buildAlternates } from "@/lib/seo";
import { CarPromo } from "@/components/car-rental/CarPromo";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: { title: "Hiking Trails in Crete - Gorges, Mountains & Coasts", desc: "50 hiking trails in Crete rated by difficulty, with the elevation gain of each: Samaria Gorge, Imbros, coastal paths and mountain routes." },
  fr: { title: "Randonnées en Crète - Gorges, Montagnes & Sentiers", desc: "50 sentiers de randonnée en Crète classés par difficulté, avec le dénivelé de chacun : gorge de Samaria, Imbros, sentiers côtiers et routes de montagne." },
  de: { title: "Wanderwege auf Kreta - Schluchten, Berge & Küste", desc: "50 Wanderwege auf Kreta nach Schwierigkeit, mit dem Höhenunterschied jeder Route: Samaria-Schlucht, Imbros, Küstenpfade und Bergrouten." },
  el: { title: "Μονοπάτια Πεζοπορίας στην Κρήτη - Φαράγγια & Βουνά", desc: "50 μονοπάτια πεζοπορίας στην Κρήτη κατά δυσκολία, με την υψομετρική διαφορά του καθενός: φαράγγι Σαμαριάς, Ίμπρος, παράκτια και ορεινά μονοπάτια." },
};

// Libellés de la liste. Les 18 locales retirées redirigent vers /en : 4 suffisent.
const L: Record<string, {
  found: (n: number) => string; difficulty: string; type: string; all: string; none: string; clear: string;
  levels: Record<Hike["difficulty"], string>; types: Record<Hike["type"], string>;
}> = {
  en: { found: (n) => `${n} trail${n !== 1 ? "s" : ""}`, difficulty: "Difficulty", type: "Type", all: "All", none: "No trails match the selected filters.", clear: "Clear filters",
    levels: { easy: "Easy", moderate: "Moderate", hard: "Hard", expert: "Expert" }, types: { gorge: "Gorge", coastal: "Coastal", mountain: "Mountain", cultural: "Cultural" } },
  fr: { found: (n) => `${n} sentier${n > 1 ? "s" : ""}`, difficulty: "Difficulté", type: "Type", all: "Tous", none: "Aucun sentier ne correspond à ces filtres.", clear: "Effacer les filtres",
    levels: { easy: "Accessible", moderate: "Moyen", hard: "Difficile", expert: "Expert" }, types: { gorge: "Gorge", coastal: "Côtier", mountain: "Montagne", cultural: "Patrimoine" } },
  de: { found: (n) => `${n} Wanderweg${n !== 1 ? "e" : ""}`, difficulty: "Schwierigkeit", type: "Typ", all: "Alle", none: "Kein Wanderweg passt zu diesen Filtern.", clear: "Filter zurücksetzen",
    levels: { easy: "Leicht", moderate: "Mittel", hard: "Schwer", expert: "Experte" }, types: { gorge: "Schlucht", coastal: "Küste", mountain: "Berg", cultural: "Kultur" } },
  el: { found: (n) => `${n} μονοπάτι${n !== 1 ? "α" : ""}`, difficulty: "Δυσκολία", type: "Τύπος", all: "Όλα", none: "Κανένα μονοπάτι δεν ταιριάζει με τα φίλτρα.", clear: "Καθαρισμός φίλτρων",
    levels: { easy: "Εύκολο", moderate: "Μέτριο", hard: "Δύσκολο", expert: "Για έμπειρους" }, types: { gorge: "Φαράγγι", coastal: "Παράκτιο", mountain: "Ορεινό", cultural: "Πολιτιστικό" } },
};

const DIFFICULTY_STYLES: Record<Hike["difficulty"], { classes: string }> = {
  easy: { classes: "bg-green-100 text-green-700" },
  moderate: { classes: "bg-amber-100 text-amber-700" },
  hard: { classes: "bg-orange-100 text-orange-700" },
  expert: { classes: "bg-red-100 text-red-700" },
};

const DIFFICULTIES: Hike["difficulty"][] = ["easy", "moderate", "hard", "expert"];
const TYPES: Hike["type"][] = ["gorge", "coastal", "mountain", "cultural"];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
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
  setRequestLocale(locale);
  const { difficulty, type } = await searchParams;
  const loc = locale as Locale;
  if (!HIKES_PUBLISHED) notFound();

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
  const l = L[locale] || L.en;
  // Un filtre sans fiche derrière mène à une page vide : on ne propose que les types renseignés.
  const types = TYPES.filter((t) => hikes.some((h) => h.type === t));

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Mountain className="w-7 h-7 text-sea" />
          <h1 className="text-3xl font-bold text-sea">
            {META[locale]?.title || META.en.title}
          </h1>
        </div>
        <p className="text-text-muted mt-1 mb-8">
          {l.found(filtered.length)}
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {/* Difficulty filter */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">{l.difficulty} :</span>
            <Link
              href={`/${locale}/hikes${type ? `?type=${type}` : ""}`}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${!difficulty ? "bg-sea text-white border-sea" : "border-border text-text-muted hover:border-sea/50"}`}
            >
              {l.all}
            </Link>
            {DIFFICULTIES.map((d) => {
              const style = DIFFICULTY_STYLES[d];
              const isActive = difficulty === d;
              const href = `/${locale}/hikes?difficulty=${d}${type ? `&type=${type}` : ""}`;
              return (
                <Link
                  key={d}
                  href={href}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${isActive ? style.classes + " border-transparent font-semibold" : "border-border text-text-muted hover:border-sea/50"}`}
                >
                  {l.levels[d]}
                </Link>
              );
            })}
          </div>

          {/* Type filter */}
          {types.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">{l.type} :</span>
            <Link
              href={`/${locale}/hikes${difficulty ? `?difficulty=${difficulty}` : ""}`}
              className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${!type ? "bg-sea text-white border-sea" : "border-border text-text-muted hover:border-sea/50"}`}
            >
              {l.all}
            </Link>
            {types.map((t) => {
              const isActive = type === t;
              const href = `/${locale}/hikes?type=${t}${difficulty ? `&difficulty=${difficulty}` : ""}`;
              return (
                <Link
                  key={t}
                  href={href}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${isActive ? "bg-sea text-white border-sea font-semibold" : "border-border text-text-muted hover:border-sea/50"}`}
                >
                  {l.types[t]}
                </Link>
              );
            })}
          </div>
          )}
        </div>

        {/* Excursions GYG : l'index rando = forte intention activité. Tous les
            /hikes/[slug] ont déjà ce CTA (source mesurée des clics GYG, 24/06) ;
            on couvre ici le seul trou restant parmi les pages activité. */}
        <div className="mb-8">
          <CarPromo locale={locale} source="hikes-index" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <Footprints className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{l.none}</p>
            <Link href={`/${locale}/hikes`} className="text-sea text-sm hover:underline mt-2 inline-block">
              {l.clear}
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
                  className="group rounded-xl border border-border bg-white overflow-hidden hover:border-sea/30 hover:shadow-soft transition-all"
                >
                  {hike.image_url && (
                    <div className="h-40 bg-sea-faint overflow-hidden">
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
                        {l.levels[hike.difficulty]}
                      </span>
                    </div>

                    {hike.type ? (
                      <div className="flex items-center gap-1 text-xs text-text-muted mb-3">
                        <MapPin className="w-3 h-3" />
                        {l.types[hike.type]}
                      </div>
                    ) : (
                      <div className="mb-3" />
                    )}

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
          <Mountain className="w-7 h-7 text-sea" />
          <h1 className="text-3xl font-bold text-sea">
            {META[locale]?.title || META.en.title}
          </h1>
        </div>
        <p className="text-text-muted mt-2 mb-8">Trails data loading soon.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-white p-4 animate-pulse">
              <div className="h-32 bg-surface rounded-lg mb-3" />
              <div className="h-5 bg-surface rounded w-2/3 mb-2" />
              <div className="h-3 bg-surface rounded w-1/3 mb-3" />
              <div className="flex gap-2">
                <div className="h-3 bg-surface rounded w-12" />
                <div className="h-3 bg-surface rounded w-16" />
                <div className="h-3 bg-surface rounded w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
