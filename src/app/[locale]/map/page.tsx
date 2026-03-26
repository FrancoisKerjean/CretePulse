import { getAllBeaches } from "@/lib/beaches";
import { getAllVillages } from "@/lib/villages";
import { getAllFoodPlaces } from "@/lib/food";
import { getAllHikes } from "@/lib/hikes";
import { getLocalizedField, type Locale } from "@/lib/types";
import { MapView } from "@/components/map/MapView";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: { title: "Interactive Map of Crete - Beaches, Villages, Food, Hikes | Crete Direct", desc: "Explore Crete on an interactive map. Find beaches, villages, restaurants, and hiking trails across the island." },
  fr: { title: "Carte Interactive de la Crète - Plages, Villages, Restaurants | Crete Direct", desc: "Explorez la Crète sur une carte interactive. Trouvez plages, villages, restaurants et sentiers de randonnée." },
  de: { title: "Interaktive Karte von Kreta - Strände, Dörfer, Essen, Wandern | Crete Direct", desc: "Entdecken Sie Kreta auf einer interaktiven Karte. Finden Sie Strände, Dörfer, Restaurants und Wanderwege." },
  el: { title: "Διαδραστικός Χάρτης Κρήτης - Παραλίες, Χωριά, Φαγητό | Crete Direct", desc: "Εξερευνήστε την Κρήτη σε διαδραστικό χάρτη. Βρείτε παραλίες, χωριά, εστιατόρια και μονοπάτια." },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const m = META[locale] || META.en;
  const url = `${BASE_URL}/${locale}/map`;
  return {
    title: m.title,
    description: m.desc,
    alternates: { canonical: url },
    openGraph: { title: m.title, description: m.desc, url },
  };
}

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;

  // Fetch all data in parallel
  const [beaches, villages, foodPlaces, hikes] = await Promise.all([
    getAllBeaches().catch(() => []),
    getAllVillages().catch(() => []),
    getAllFoodPlaces().catch(() => []),
    getAllHikes().catch(() => []),
  ]);

  // Transform to POI format
  const beachPOIs = beaches.filter(b => b.latitude && b.longitude).map(b => ({
    id: b.id, name: getLocalizedField(b, "name", loc), type: "beach" as const,
    lat: b.latitude, lng: b.longitude, slug: b.slug, extra: b.type || "",
  }));

  const villagePOIs = villages.filter(v => v.latitude && v.longitude).map(v => ({
    id: v.id, name: getLocalizedField(v, "name", loc), type: "village" as const,
    lat: v.latitude, lng: v.longitude, slug: v.slug, extra: v.region || "",
  }));

  const foodPOIs = foodPlaces.filter(f => f.latitude && f.longitude).map(f => ({
    id: f.id, name: f.name, type: "food" as const,
    lat: f.latitude!, lng: f.longitude!, slug: f.slug, extra: f.cuisine || f.type || "",
  }));

  const hikePOIs = hikes.filter(h => h.start_latitude && h.start_longitude).map(h => ({
    id: h.id, name: getLocalizedField(h, "name", loc), type: "hike" as const,
    lat: h.start_latitude!, lng: h.start_longitude!, slug: h.slug, extra: h.difficulty || "",
  }));

  const titles: Record<string, string> = {
    en: "Explore Crete", fr: "Explorer la Crète", de: "Kreta entdecken", el: "Εξερεύνηση Κρήτης",
  };
  const subtitles: Record<string, string> = {
    en: `${beachPOIs.length} beaches, ${villagePOIs.length} villages, ${foodPOIs.length} restaurants, ${hikePOIs.length} trails`,
    fr: `${beachPOIs.length} plages, ${villagePOIs.length} villages, ${foodPOIs.length} restaurants, ${hikePOIs.length} sentiers`,
    de: `${beachPOIs.length} Strände, ${villagePOIs.length} Dörfer, ${foodPOIs.length} Restaurants, ${hikePOIs.length} Wege`,
    el: `${beachPOIs.length} παραλίες, ${villagePOIs.length} χωριά, ${foodPOIs.length} εστιατόρια, ${hikePOIs.length} μονοπάτια`,
  };

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-aegean">{titles[locale] || titles.en}</h1>
          <p className="text-sm text-text-muted mt-1">{subtitles[locale] || subtitles.en}</p>
        </div>
        <MapView
          beaches={beachPOIs}
          villages={villagePOIs}
          food={foodPOIs}
          hikes={hikePOIs}
          locale={locale}
        />
      </div>
    </main>
  );
}
