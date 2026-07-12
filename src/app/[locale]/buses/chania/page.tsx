import { setRequestLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import { CitybusPlanner } from "@/components/buses/CitybusPlanner";
import { CITYBUS_DATA } from "@/data/chania-bus";

// Calculateur de trajets du bus urbain de Chania (Astiko KTEL, réseau citybus.gr agency 120).
// Data statique (src/data/chania-bus.ts) -> page rendue statiquement (ISR 24h).
export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Chania city bus: lines, stops & trip planner",
    desc: "Plan a trip on Chania's urban bus network (Astiko KTEL). City and suburban lines. Live map and estimated times.",
  },
  fr: {
    title: "Bus urbain de Chania : lignes, arrêts et calculateur",
    desc: "Calculez votre trajet sur le réseau de bus urbain de Chania (Astiko KTEL). Lignes ville et périphérie. Carte en direct et temps estimés.",
  },
  de: {
    title: "Stadtbus Chania: Linien, Haltestellen & Routenplaner",
    desc: "Planen Sie Ihre Fahrt im Stadtbusnetz von Chania (Astiko KTEL). Stadt- und Vorortlinien. Live-Karte und geschätzte Zeiten.",
  },
  el: {
    title: "Αστικό λεωφορείο Χανίων: γραμμές, στάσεις & δρομολόγια",
    desc: "Σχεδιάστε τη διαδρομή σας στο αστικό δίκτυο λεωφορείων Χανίων (Αστικό ΚΤΕΛ). Γραμμές πόλης και προαστίων. Ζωντανός χάρτης και εκτιμώμενοι χρόνοι.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[locale] ?? META.en;
  const url = `${BASE_URL}/${locale}/buses/chania`;
  const ogImage = `${BASE_URL}/api/og?type=transport&title=${encodeURIComponent(m.title)}&subtitle=${encodeURIComponent(m.desc.slice(0, 120))}`;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/buses/chania"),
    openGraph: {
      title: m.title,
      description: m.desc,
      url,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: m.title }],
    },
    twitter: { card: "summary_large_image", title: m.title, description: m.desc, images: [ogImage] },
  };
}

export default async function ChaniaBusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CitybusPlanner locale={locale} data={CITYBUS_DATA} />;
}
