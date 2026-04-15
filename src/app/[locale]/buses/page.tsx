import { BusesClient } from "./BusesClient";
import { buildAlternates } from "@/lib/seo";

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
  const m = META[locale] || META.en;
  const url = `${BASE_URL}/${locale}/buses`;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/buses"),
    openGraph: { title: m.title, description: m.desc, url, type: "website" },
  };
}

export default function BusesPage() {
  return <BusesClient />;
}
