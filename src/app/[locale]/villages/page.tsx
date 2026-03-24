import { getTranslations } from "next-intl/server";
import { getAllVillages } from "@/lib/villages";
import { getLocalizedField, type Locale } from "@/lib/types";
import { MapPin, Mountain, Users, Clock } from "lucide-react";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return {
    title: `Villages in Crete - CretePulse`,
    description: "Explore 300+ villages of Crete, from Minoan ruins to hidden mountain hamlets.",
  };
}

const PERIOD_COLORS: Record<string, string> = {
  minoan: "bg-terra-faint text-terra",
  venetian: "bg-aegean-faint text-aegean",
  ottoman: "bg-sand text-text-muted",
  modern: "bg-stone text-text-muted",
  abandoned: "bg-stone-warm text-text-light",
};

export default async function VillagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;

  let villages: Awaited<ReturnType<typeof getAllVillages>> = [];
  try {
    villages = await getAllVillages();
  } catch {
    villages = [];
  }

  if (villages.length === 0) {
    return <VillagesPlaceholder locale={loc} />;
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-aegean">
          {loc === "fr" ? "Villages de Crète" :
           loc === "de" ? "Dörfer auf Kreta" :
           loc === "el" ? "Χωριά της Κρήτης" :
           "Villages of Crete"}
        </h1>
        <p className="text-text-muted mt-2">{villages.length} villages, from coastal to mountain</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {villages.map((village) => (
            <Link
              key={village.slug}
              href={`/${locale}/villages/${village.slug}`}
              className="group rounded-xl border border-border bg-white overflow-hidden hover:border-aegean/30 hover:shadow-md transition-all"
            >
              {village.image_url && (
                <div className="h-40 bg-stone overflow-hidden">
                  <img
                    src={village.image_url}
                    alt={getLocalizedField(village, "name", loc)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-lg leading-tight">
                    {getLocalizedField(village, "name", loc)}
                  </h2>
                  {village.period && (
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full capitalize ${PERIOD_COLORS[village.period] || "bg-stone text-text-muted"}`}>
                      {village.period}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                  <MapPin className="w-3 h-3" />
                  {village.municipality || village.region}
                </div>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-text-muted">
                  {village.altitude_m != null && (
                    <span className="inline-flex items-center gap-1">
                      <Mountain className="w-3 h-3 text-olive" />
                      {village.altitude_m} m
                    </span>
                  )}
                  {village.population != null && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3 text-aegean" />
                      {village.population.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

function VillagesPlaceholder({ locale }: { locale: Locale }) {
  const titles: Record<Locale, string> = {
    en: "Villages of Crete",
    fr: "Villages de Crète",
    de: "Dörfer auf Kreta",
    el: "Χωριά της Κρήτης",
  };

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-aegean">{titles[locale]}</h1>
        <p className="text-text-muted mt-2">300+ villages coming soon. Data being loaded.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
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
