import { getAllBeaches } from "@/lib/beaches";
import { setRequestLocale } from "next-intl/server";
import { getLocalizedField, type Locale } from "@/lib/types";
import { Waves, MapPin, Car, Fish } from "lucide-react";
import Link from "next/link";
import { buildAlternates } from "@/lib/seo";
import { itemListSchema } from "@/lib/schema";
import { BeachImage } from "@/components/BeachImage";

const REGION_LABELS: Record<Locale, Record<string, string>> = {
  en: { east: "east Crete", west: "west Crete", central: "central Crete", south: "south Crete" },
  fr: { east: "Crète de l'est", west: "Crète de l'ouest", central: "Crète centrale", south: "Crète du sud" },
  de: { east: "Ostkreta", west: "Westkreta", central: "Mittelkreta", south: "Südkreta" },
  el: { east: "ανατολική Κρήτη", west: "δυτική Κρήτη", central: "κεντρική Κρήτη", south: "νότια Κρήτη" },
};

const TYPE_LABELS: Record<Locale, Record<string, string>> = {
  en: { sand: "sandy", pebble: "pebble", rock: "rocky", mixed: "mixed" },
  fr: { sand: "de sable", pebble: "de galets", rock: "rocheuse", mixed: "mixte" },
  de: { sand: "Sand-", pebble: "Kiesel-", rock: "Fels-", mixed: "gemischt" },
  el: { sand: "αμμώδης", pebble: "βότσαλο", rock: "βραχώδης", mixed: "μικτή" },
};

export const revalidate = 86400;

const BEACHES_LABELS: Record<Locale, { subtitle: string; parking: string; kidsOk: string; coming: string }> = {
  en: { subtitle: "beaches with real-time conditions", parking: "Parking", kidsOk: "Kids OK", coming: "500+ beaches coming soon. Data being loaded." },
  fr: { subtitle: "plages avec conditions en temps réel", parking: "Parking", kidsOk: "Enfants OK", coming: "500+ plages à venir. Données en cours de chargement." },
  de: { subtitle: "Strände mit Echtzeitbedingungen", parking: "Parkplatz", kidsOk: "Kinder OK", coming: "500+ Strände demnächst. Daten werden geladen." },
  el: { subtitle: "παραλίες με συνθήκες σε πραγματικό χρόνο", parking: "Πάρκινγκ", kidsOk: "Παιδιά OK", coming: "500+ παραλίες σύντομα. Τα δεδομένα φορτώνονται." },
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: { title: "500+ Beaches in Crete - Real-Time Conditions | Crete Direct", desc: "Explore 500+ beaches across Crete with real-time wind, sea and conditions. Sandy coves, pebble shores, snorkeling spots - filter by region and facilities." },
  fr: { title: "500+ Plages en Crète - Conditions en Temps Réel | Crete Direct", desc: "Explorez 500+ plages de Crète avec conditions en temps réel : vent, mer, snorkeling. Filtrez par région et équipements." },
  de: { title: "500+ Strände auf Kreta - Echtzeit-Bedingungen | Crete Direct", desc: "Entdecken Sie 500+ Strände auf Kreta mit Echtzeit-Wind- und Meeresbedingungen. Filtern nach Region und Einrichtungen." },
  el: { title: "500+ Παραλίες στην Κρήτη - Συνθήκες Πραγματικού Χρόνου | Crete Direct", desc: "Εξερευνήστε 500+ παραλίες στην Κρήτη με συνθήκες σε πραγματικό χρόνο. Ανέμος, θάλασσα, snorkeling." },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[locale] || META.en;
  const url = `${BASE_URL}/${locale}/beaches`;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/beaches"),
    openGraph: { title: m.title, description: m.desc, url, type: "website" },
  };
}

export default async function BeachesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  // Fallback to en on extended locales to avoid `undefined.x` crashes.
  const regionLabels = REGION_LABELS[loc] ?? REGION_LABELS.en;
  const typeLabels = TYPE_LABELS[loc] ?? TYPE_LABELS.en;
  const beachesLabels = BEACHES_LABELS[loc] ?? BEACHES_LABELS.en;

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

  const listSchema = itemListSchema(
    beaches.slice(0, 100).map((b) => ({
      url: `${BASE_URL}/${locale}/beaches/${b.slug}`,
      name: getLocalizedField(b, "name", loc),
      image: b.image_url,
    })),
    "Beaches in Crete",
  );

  return (
    <main className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }} />
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-aegean">
          {getLocalizedField({ title_en: "Beaches in Crete", title_fr: "Plages en Crète", title_de: "Strände auf Kreta", title_el: "Παραλίες στην Κρήτη" }, "title", loc)}
        </h1>
        <p className="text-text-muted mt-2">
          {beaches.length} {beachesLabels.subtitle}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {beaches.map((beach) => (
            <Link
              key={beach.slug}
              href={`/${locale}/beaches/${beach.slug}`}
              className="group rounded-xl border border-border bg-white overflow-hidden hover:border-aegean/30 hover:shadow-md transition-all"
            >
              <div className="h-40 overflow-hidden">
                <BeachImage
                  src={beach.image_url}
                  alt={`${getLocalizedField(beach, "name", loc)} beach, ${regionLabels[beach.region] || beach.region}${beach.type ? `, ${typeLabels[beach.type] || beach.type}` : ""}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
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
                      <Car className="w-3 h-3" /> {beachesLabels.parking}
                    </span>
                  )}
                  {beach.snorkeling && (
                    <span className="inline-flex items-center gap-1 text-xs bg-aegean-faint text-aegean px-2 py-0.5 rounded-full">
                      <Fish className="w-3 h-3" /> Snorkeling
                    </span>
                  )}
                  {beach.kids_friendly && (
                    <span className="inline-flex items-center gap-1 text-xs bg-terra-faint text-terra px-2 py-0.5 rounded-full">
                      {beachesLabels.kidsOk}
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
  // Fallback to en on extended locales to avoid `undefined.x` crashes.
  const beachesLabels = BEACHES_LABELS[locale] ?? BEACHES_LABELS.en;

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-aegean">{titles[locale] ?? titles.en}</h1>
        <p className="text-text-muted mt-2">{beachesLabels.coming}</p>
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
