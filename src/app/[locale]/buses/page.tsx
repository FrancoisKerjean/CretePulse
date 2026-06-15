import { BusesClient } from "./BusesClient";
import { setRequestLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import { getBusRoutes, getBusDestinations, latestScrapedAt } from "@/lib/buses";
import { getBusAlerts } from "@/lib/bus-alerts";
import { busesPageSchema } from "@/lib/schema";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: { title: "Crete Bus Timetables 2026 - KTEL Schedules & Ticket Prices", desc: "All KTEL bus timetables for Crete with 2026 ticket prices: Heraklion–Chania, Heraklion–Agios Nikolaos, Chania–Elafonissi, airport connections, journey times and a free route planner." },
  fr: { title: "Horaires de Bus en Crète 2026 - Lignes et Prix KTEL", desc: "Tous les horaires de bus KTEL en Crète avec les prix 2026 : Héraklion–La Canée, Héraklion–Agios Nikolaos, La Canée–Elafonissi, liaisons aéroport, durées de trajet et planificateur d'itinéraire gratuit." },
  de: { title: "Kreta Busfahrplan 2026 - KTEL Abfahrtszeiten & Preise", desc: "Alle KTEL-Busfahrpläne für Kreta mit Ticketpreisen 2026: Heraklion–Chania, Heraklion–Agios Nikolaos, Chania–Elafonissi, Flughafenverbindungen, Fahrzeiten und kostenloser Routenplaner." },
  el: { title: "Δρομολόγια ΚΤΕΛ Κρήτης 2026 - Ώρες & Τιμές Εισιτηρίων", desc: "Όλα τα δρομολόγια ΚΤΕΛ Κρήτης με τιμές εισιτηρίων 2026: Ηράκλειο–Χανιά, Ηράκλειο–Άγιος Νικόλαος, Χανιά–Ελαφονήσι, συνδέσεις αεροδρομίου, χρόνοι διαδρομής και δωρεάν σχεδιασμός διαδρομής." },
  fi: { title: "Kreetan bussiaikataulut 2026 - KTEL-reitit ja hinnat", desc: "Kaikki KTEL-bussiaikataulut Kreetalla 2026: Heraklion-Chania, Heraklion-Agios Nikolaos, lentokenttayhteydet, matka-ajat ja ilmainen reittiopas." },
  nl: { title: "Bus dienstregeling Kreta 2026 - KTEL routes en prijzen", desc: "Alle KTEL busdienstregelingen op Kreta 2026: Heraklion-Chania, Heraklion-Agios Nikolaos, luchthavenverbindingen, reistijden en gratis routeplanner." },
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
  const [routes, destinations, alerts] = await Promise.all([
    getBusRoutes(),
    getBusDestinations(),
    getBusAlerts(),
  ]);
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
        alerts={alerts}
      />
    </>
  );
}
