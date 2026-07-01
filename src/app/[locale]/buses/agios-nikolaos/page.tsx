import { setRequestLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import { AgnikPlannerClient } from "./AgnikPlannerClient";

// Calculateur de trajets du bus urbain GRATUIT d'Agios Nikolaos (3 lignes agncitybus).
// Data statique (src/data/agnik-bus.ts) -> page rendue statiquement (ISR 24h).
export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Agios Nikolaos free city bus: routes, stops & trip planner",
    desc: "Plan a trip on the free Agios Nikolaos city bus. 3 lines (yellow, red, green), every 30 min, 7am-10pm. Live map and estimated times.",
  },
  fr: {
    title: "Bus urbain gratuit d'Agios Nikolaos : lignes, arrêts et calculateur",
    desc: "Calculez votre trajet sur le bus urbain gratuit d'Agios Nikolaos. 3 lignes (jaune, rouge, verte), toutes les 30 min, 7h-22h. Carte en direct et temps estimés.",
  },
  de: {
    title: "Kostenloser Stadtbus Agios Nikolaos: Linien, Haltestellen & Routenplaner",
    desc: "Planen Sie Ihre Fahrt mit dem kostenlosen Stadtbus von Agios Nikolaos. 3 Linien (gelb, rot, grün), alle 30 Min., 7-22 Uhr. Live-Karte und geschätzte Zeiten.",
  },
  el: {
    title: "Δωρεάν αστικό λεωφορείο Αγίου Νικολάου: γραμμές, στάσεις & δρομολόγια",
    desc: "Σχεδιάστε τη διαδρομή σας με το δωρεάν αστικό λεωφορείο του Αγίου Νικολάου. 3 γραμμές (κίτρινη, κόκκινη, πράσινη), κάθε 30 λεπτά, 7π.μ.-10μ.μ. Ζωντανός χάρτης και εκτιμώμενοι χρόνοι.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[locale] ?? META.en;
  const url = `${BASE_URL}/${locale}/buses/agios-nikolaos`;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/buses/agios-nikolaos"),
    openGraph: { title: m.title, description: m.desc, url, type: "website" },
  };
}

export default async function AgnikBusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AgnikPlannerClient locale={locale} />;
}
