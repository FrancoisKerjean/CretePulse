import { getTranslations } from "next-intl/server";
import { getVillageBySlug, getNearbyVillages } from "@/lib/villages";
import { getLocalizedField, type Locale } from "@/lib/types";
import { breadcrumbSchema } from "@/lib/schema";
import { MapPin, Mountain, Users, Clock, ChevronLeft, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const village = await getVillageBySlug(slug);
  if (!village) return { title: "Village not found" };

  const name = getLocalizedField(village, "name", locale as Locale);
  const desc = getLocalizedField(village, "description", locale as Locale);
  const title = `${name}, Crete - History & Guide | Crete Direct`;
  const description = desc?.substring(0, 160) || `${name} village in Crete, Greece. History, population, altitude and local guide.`;
  const url = `${BASE_URL}/${locale}/villages/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: village.image_url ? [{ url: village.image_url, alt: `${name}, Crete` }] : [],
    },
  };
}

const PERIOD_LABEL: Record<string, string> = {
  minoan: "Minoan era",
  venetian: "Venetian era",
  ottoman: "Ottoman era",
  modern: "Modern",
  abandoned: "Abandoned",
};

const PERIOD_COLORS: Record<string, string> = {
  minoan: "bg-terra-faint text-terra border-terra/20",
  venetian: "bg-aegean-faint text-aegean border-aegean/20",
  ottoman: "bg-sand text-text border-sand-warm",
  modern: "bg-stone text-text-muted border-border",
  abandoned: "bg-stone-warm text-text-light border-border",
};

export default async function VillageDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const loc = locale as Locale;

  const village = await getVillageBySlug(slug);
  if (!village) notFound();

  const nearby = await getNearbyVillages(village.latitude, village.longitude, village.slug);
  const name = getLocalizedField(village, "name", loc);
  const description = getLocalizedField(village, "description", loc);
  const breadcrumb = breadcrumbSchema([
    { name: "Crete Direct", url: `${BASE_URL}/${locale}` },
    { name: loc === "fr" ? "Villages" : loc === "de" ? "Dörfer" : loc === "el" ? "Χωριά" : "Villages", url: `${BASE_URL}/${locale}/villages` },
    { name, url: `${BASE_URL}/${locale}/villages/${village.slug}` },
  ]);

  return (
    <main className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {/* Hero image */}
      {village.image_url && (
        <div className="relative h-64 md:h-80 bg-aegean">
          <img
            src={village.image_url}
            alt={name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white">{name}</h1>
            <div className="flex items-center gap-2 text-white/80 text-sm mt-1">
              <MapPin className="w-4 h-4" />
              {village.municipality || village.region}, Crete
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href={`/${locale}/villages`}
          className="inline-flex items-center gap-1 text-sm text-aegean hover:underline mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> All villages
        </Link>

        {!village.image_url && (
          <h1 className="text-3xl font-bold text-aegean mb-2">{name}</h1>
        )}

        {/* Period badge */}
        {village.period && (
          <span className={`inline-block text-sm px-3 py-1 rounded-full border capitalize mb-6 ${PERIOD_COLORS[village.period] || "bg-stone text-text-muted border-border"}`}>
            <Clock className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
            {PERIOD_LABEL[village.period] || village.period}
          </span>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Mountain className="w-5 h-5 text-olive mx-auto" />
            <p className="text-xs text-text-muted mt-1">Altitude</p>
            <p className="font-semibold text-sm">
              {village.altitude_m != null ? `${village.altitude_m} m` : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Users className="w-5 h-5 text-aegean mx-auto" />
            <p className="text-xs text-text-muted mt-1">Population</p>
            <p className="font-semibold text-sm">
              {village.population != null ? village.population.toLocaleString() : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <MapPin className="w-5 h-5 text-terra mx-auto" />
            <p className="text-xs text-text-muted mt-1">Region</p>
            <p className="font-semibold text-sm capitalize">{village.region || "—"}</p>
          </div>
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Clock className="w-5 h-5 text-aegean mx-auto" />
            <p className="text-xs text-text-muted mt-1">Era</p>
            <p className="font-semibold text-sm capitalize">{village.period || "—"}</p>
          </div>
        </div>

        {/* Highlights */}
        {village.highlights && village.highlights.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-aegean mb-3">Highlights</h2>
            <ul className="space-y-2">
              {village.highlights.map((highlight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text">
                  <Star className="w-4 h-4 text-terra shrink-0 mt-0.5" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Description */}
        {description && (
          <div className="prose prose-sm max-w-none mb-8">
            <p className="text-text leading-relaxed">{description}</p>
          </div>
        )}

        {/* Map link */}
        <a
          href={`https://www.google.com/maps?q=${village.latitude},${village.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-aegean text-white rounded-lg text-sm font-medium hover:bg-aegean-light transition-colors mb-12"
        >
          <MapPin className="w-4 h-4" /> Open in Google Maps
        </a>

        {/* Nearby villages */}
        {nearby.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-aegean mb-4">Nearby villages</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {nearby.map((v) => (
                <Link
                  key={v.slug}
                  href={`/${locale}/villages/${v.slug}`}
                  className="rounded-xl border border-border bg-white p-3 hover:border-aegean/30 transition-all"
                >
                  <p className="font-semibold text-sm">{getLocalizedField(v, "name", loc)}</p>
                  <p className="text-xs text-text-muted capitalize">{v.period} - {v.region}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Image credit */}
        {village.image_credit && (
          <p className="text-[10px] text-text-light mt-8">Photo: {village.image_credit}</p>
        )}
      </div>
    </main>
  );
}
