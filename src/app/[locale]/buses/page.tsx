import { BusesClient } from "./BusesClient";
import { setRequestLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import { getBusRoutes, getBusDestinations, latestScrapedAt } from "@/lib/buses";
import { busesPageSchema } from "@/lib/schema";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: { title: "Crete Bus Schedules - KTEL Routes & Prices | Crete Direct", desc: "KTEL public bus schedules for Crete. Heraklion, Chania, Rethymno, Agios Nikolaos, Ierapetra, Sitia routes with prices and journey times." },
  fr: { title: "Horaires Bus Crète - Lignes & Tarifs KTEL | Crete Direct", desc: "Horaires des bus KTEL pour la Crète. Lignes Héraklion, La Canée, Rethymnon, Agios Nikolaos avec prix et durées de trajet." },
  de: { title: "Kreta Busfahrplan - KTEL Strecken & Preise | Crete Direct", desc: "KTEL Busfahrpläne für Kreta. Heraklion, Chania, Rethymno, Agios Nikolaos Strecken mit Preisen und Fahrtzeiten." },
  el: { title: "Δρομολόγια ΚΤΕΛ Κρήτης - Γραμμές & Τιμές | Crete Direct", desc: "Δρομολόγια ΚΤΕΛ για την Κρήτη. Ηράκλειο, Χανιά, Ρέθυμνο, Άγιος Νικόλαος με τιμές και χρόνους διαδρομής." },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[locale] || META.en;
  const url = `${BASE_URL}/${locale}/buses`;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/buses"),
    openGraph: { title: m.title, description: m.desc, url, type: "website" },
  };
}

const FAQ: Record<string, Array<{ q: string; a: string }>> = {
  en: [
    { q: "How do I get to the beaches by bus in Crete?", a: "Major beaches near towns (Matala, Elafonissi) are served by KTEL in summer; remote beaches like Balos have no direct bus and need a car or boat." },
    { q: "Are there night buses in Crete?", a: "KTEL service is daytime; last departures on most routes are around 21:00, with more frequent runs in summer (May–October)." },
    { q: "Which company runs the buses in Crete?", a: "Two KTEL operators: Heraklion-Lasithi covers east and central Crete, Chania-Rethymno covers the west." },
  ],
  fr: [
    { q: "Comment aller aux plages en bus en Crète ?", a: "Les grandes plages près des villes (Matala, Elafonissi) sont desservies par KTEL l'été ; les plages isolées comme Balos n'ont pas de bus direct et nécessitent une voiture ou un bateau." },
    { q: "Y a-t-il des bus de nuit en Crète ?", a: "Le service KTEL est diurne ; les derniers départs sont vers 21h sur la plupart des lignes, plus fréquents l'été (mai–octobre)." },
    { q: "Quelle compagnie gère les bus en Crète ?", a: "Deux opérateurs KTEL : Héraklion-Lassithi pour l'est et le centre, La Canée-Rethymnon pour l'ouest." },
  ],
};

export default async function BusesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [routes, destinations] = await Promise.all([getBusRoutes(), getBusDestinations()]);
  const updatedAt = latestScrapedAt(routes);
  const m = META[locale] || META.en;

  const schema = busesPageSchema({
    locale,
    pageTitle: m.title,
    description: m.desc,
    routes: routes.map((r) => ({ from: r.from_place, to: r.to_place })),
    dateModified: updatedAt,
    faqItems: FAQ[locale] || FAQ.en,
    breadcrumbLabels: { home: "Home", buses: "Buses" },
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <BusesClient
        routes={routes}
        destinations={destinations}
        updatedAt={updatedAt}
      />
    </>
  );
}
