import { getAllBeaches } from "@/lib/beaches";
import { getAllVillages } from "@/lib/villages";
import { getLocalizedField, type Locale } from "@/lib/types";
import { Waves, MapPin, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildAlternates } from "@/lib/seo";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function generateStaticParams() {
  try {
    const villages = await getAllVillages();
    return villages.map(v => ({ village: v.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; village: string }> }) {
  const { locale, village: villageSlug } = await params;
  const loc = locale as Locale;

  let villages;
  try { villages = await getAllVillages(); } catch { return { title: "Not found" }; }
  const village = villages.find(v => v.slug === villageSlug);
  if (!village) return { title: "Not found" };

  const villageName = getLocalizedField(village, "name", loc);
  const url = `${BASE_URL}/${locale}/beaches/near/${villageSlug}`;

  const titles: Record<string, string> = {
    en: `Best Beaches Near ${villageName}, Crete | Crete Direct`,
    fr: `Meilleures Plages Près de ${villageName}, Crète | Crete Direct`,
    de: `Beste Strände in der Nähe von ${villageName}, Kreta | Crete Direct`,
    el: `Καλύτερες Παραλίες κοντά στ${villageName.startsWith("Η") ? "ο" : "ην"} ${villageName}, Κρήτη | Crete Direct`,
  };
  const descs: Record<string, string> = {
    en: `Discover the best beaches near ${villageName} in Crete. Sandy, pebble and secret coves within driving distance. Real-time conditions.`,
    fr: `Découvrez les meilleures plages près de ${villageName} en Crète. Plages de sable, galets et criques secrètes. Conditions en temps réel.`,
    de: `Entdecken Sie die besten Strände in der Nähe von ${villageName} auf Kreta. Sand-, Kiesel- und Geheimstrände. Echtzeit-Bedingungen.`,
    el: `Ανακαλύψτε τις καλύτερες παραλίες κοντά στην ${villageName} στην Κρήτη. Αμμώδεις, βοτσαλωτές παραλίες. Συνθήκες πραγματικού χρόνου.`,
  };

  return {
    title: titles[locale] || titles.en,
    description: descs[locale] || descs.en,
    alternates: buildAlternates(locale, `/beaches/near/${villageSlug}`),
    openGraph: { title: titles[locale] || titles.en, description: descs[locale] || descs.en, url },
  };
}

export default async function BeachesNearVillagePage({ params }: { params: Promise<{ locale: string; village: string }> }) {
  const { locale, village: villageSlug } = await params;
  const loc = locale as Locale;

  let villages, beaches;
  try {
    [villages, beaches] = await Promise.all([getAllVillages(), getAllBeaches()]);
  } catch {
    notFound();
  }

  const village = villages.find(v => v.slug === villageSlug);
  if (!village) notFound();

  const villageName = getLocalizedField(village, "name", loc);

  // Find nearest beaches by distance
  const nearbyBeaches = beaches
    .map(b => ({
      ...b,
      dist: Math.sqrt(
        Math.pow((b.latitude - village.latitude) * 111, 2) +
        Math.pow((b.longitude - village.longitude) * 85, 2)
      ),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 12);

  const heroTitles: Record<string, string> = {
    en: `Beaches near ${villageName}`,
    fr: `Plages près de ${villageName}`,
    de: `Strände in der Nähe von ${villageName}`,
    el: `Παραλίες κοντά στην ${villageName}`,
  };

  const distLabel: Record<string, string> = {
    en: "km away",
    fr: "km",
    de: "km entfernt",
    el: "χλμ",
  };

  return (
    <main className="min-h-screen bg-surface">
      <section className="bg-aegean text-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href={`/${locale}/beaches`} className="inline-flex items-center gap-1 text-white/50 text-sm hover:text-white/80 mb-3">
            <ChevronLeft className="w-4 h-4" /> {loc === "fr" ? "Toutes les plages" : loc === "de" ? "Alle Strände" : loc === "el" ? "Όλες οι παραλίες" : "All beaches"}
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}>
            {heroTitles[locale] || heroTitles.en}
          </h1>
          <p className="text-white/60 text-sm mt-2">{village.region}</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nearbyBeaches.map(beach => (
            <Link
              key={beach.slug}
              href={`/${locale}/beaches/${beach.slug}`}
              className="group rounded-xl border border-border bg-white overflow-hidden hover:border-aegean/30 hover:shadow-md transition-all"
            >
              {beach.image_url && (
                <div className="h-36 overflow-hidden">
                  <img src={beach.image_url} alt={getLocalizedField(beach, "name", loc)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
              )}
              <div className="p-4">
                <h2 className="font-semibold text-base text-text group-hover:text-aegean transition-colors">
                  {getLocalizedField(beach, "name", loc)}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-muted flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {beach.dist.toFixed(1)} {distLabel[locale] || distLabel.en}
                  </span>
                  <span className="text-xs bg-aegean-faint text-aegean px-1.5 py-0.5 rounded capitalize flex items-center gap-1">
                    <Waves className="w-3 h-3" /> {beach.type || "mixed"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Other villages */}
        <section className="mt-12">
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">
            {loc === "fr" ? "Autres villages" : loc === "de" ? "Andere Dörfer" : loc === "el" ? "Άλλα χωριά" : "Other villages"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {villages.filter(v => v.slug !== villageSlug && v.region === village.region).slice(0, 10).map(v => (
              <Link
                key={v.slug}
                href={`/${locale}/beaches/near/${v.slug}`}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-border text-text-muted hover:bg-aegean-faint hover:text-aegean transition-colors"
              >
                {getLocalizedField(v, "name", loc)}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
