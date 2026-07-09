import { setRequestLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import { CitybusPlanner } from "@/components/buses/CitybusPlanner";
import { CITYBUS_DATA } from "@/data/heraklion-bus";

// Calculateur de trajets du bus urbain d'Heraklion (Astiko KTEL, 23 lignes citybus.gr).
// Data statique (src/data/heraklion-bus.ts) -> page rendue statiquement (ISR 24h).
export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Heraklion city bus: lines, stops & trip planner",
    desc: "Plan a trip on Heraklion's urban bus network (Astiko KTEL). 23 lines across the city and suburbs. Live map and estimated times.",
  },
  fr: {
    title: "Bus urbain d'Héraklion : lignes, arrêts et calculateur",
    desc: "Calculez votre trajet sur le réseau de bus urbain d'Héraklion (Astiko KTEL). 23 lignes dans la ville et sa périphérie. Carte en direct et temps estimés.",
  },
  de: {
    title: "Stadtbus Heraklion: Linien, Haltestellen & Routenplaner",
    desc: "Planen Sie Ihre Fahrt im Stadtbusnetz von Heraklion (Astiko KTEL). 23 Linien in Stadt und Vororten. Live-Karte und geschätzte Zeiten.",
  },
  el: {
    title: "Αστικό λεωφορείο Ηρακλείου: γραμμές, στάσεις & δρομολόγια",
    desc: "Σχεδιάστε τη διαδρομή σας στο αστικό δίκτυο λεωφορείων Ηρακλείου (Αστικό ΚΤΕΛ). 23 γραμμές σε πόλη και προάστια. Ζωντανός χάρτης και εκτιμώμενοι χρόνοι.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[locale] ?? META.en;
  const url = `${BASE_URL}/${locale}/buses/heraklion`;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/buses/heraklion"),
    openGraph: { title: m.title, description: m.desc, url, type: "website" },
  };
}

export default async function HeraklionBusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CitybusPlanner locale={locale} data={CITYBUS_DATA} />;
}
