import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getAllBeaches } from "@/lib/beaches";
import { getLocalizedField, type Locale } from "@/lib/types";
import { Waves, MapPin, Car, Sun as SunIcon, Fish } from "lucide-react";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "beaches" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function BeachesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;

  let beaches: Awaited<ReturnType<typeof getAllBeaches>> = [];
  try {
    beaches = await getAllBeaches();
  } catch {
    beaches = [];
  }

  // If no Supabase data yet, show placeholder
  if (beaches.length === 0) {
    return <BeachesPlaceholder locale={loc} />;
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-aegean">
          {getLocalizedField({ title_en: "Beaches in Crete", title_fr: "Plages en Crète", title_de: "Strände auf Kreta", title_el: "Παραλίες στην Κρήτη" }, "title", loc)}
        </h1>
        <p className="text-text-muted mt-2">
          {beaches.length} beaches with real-time conditions
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {beaches.map((beach) => (
            <Link
              key={beach.slug}
              href={`/${locale}/beaches/${beach.slug}`}
              className="group rounded-xl border border-border bg-white overflow-hidden hover:border-aegean/30 hover:shadow-md transition-all"
            >
              {beach.image_url && (
                <div className="h-40 bg-aegean-faint overflow-hidden">
                  <img
                    src={beach.image_url}
                    alt={getLocalizedField(beach, "name", loc)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-4">
                <h2 className="font-semibold text-lg">
                  {getLocalizedField(beach, "name", loc)}
                </h2>
                <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                  <MapPin className="w-3 h-3" />
                  {beach.region}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {beach.type && (
                    <span className="inline-flex items-center gap-1 text-xs bg-aegean-faint text-aegean px-2 py-0.5 rounded-full">
                      <Waves className="w-3 h-3" /> {beach.type}
                    </span>
                  )}
                  {beach.parking && (
                    <span className="inline-flex items-center gap-1 text-xs bg-stone text-text-muted px-2 py-0.5 rounded-full">
                      <Car className="w-3 h-3" /> Parking
                    </span>
                  )}
                  {beach.snorkeling && (
                    <span className="inline-flex items-center gap-1 text-xs bg-aegean-faint text-aegean px-2 py-0.5 rounded-full">
                      <Fish className="w-3 h-3" /> Snorkeling
                    </span>
                  )}
                  {beach.kids_friendly && (
                    <span className="inline-flex items-center gap-1 text-xs bg-terra-faint text-terra px-2 py-0.5 rounded-full">
                      Kids OK
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

function BeachesPlaceholder({ locale }: { locale: Locale }) {
  const titles = {
    en: "Beaches in Crete",
    fr: "Plages en Crète",
    de: "Strände auf Kreta",
    el: "Παραλίες στην Κρήτη",
  };

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-aegean">{titles[locale]}</h1>
        <p className="text-text-muted mt-2">500+ beaches coming soon. Data being loaded.</p>
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
