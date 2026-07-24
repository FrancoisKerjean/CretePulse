import { setRequestLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import { LiveMapClient } from "@/components/live/LiveMapClient";

export const dynamic = "force-dynamic"; // page live, pas d'ISR

const META: Record<string, { title: string; desc: string }> = {
  en: { title: "Live Crete buses (estimated)", desc: "Watch Crete's buses move in real time, estimated from the timetable. No GPS." },
  fr: { title: "Bus de Crète en direct (estimé)", desc: "Suivez les bus de Crète en direct, estimés d'après l'horaire. Sans GPS." },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[locale] ?? META.en;
  return { title: m.title, description: m.desc, alternates: buildAlternates(locale, "/live") };
}

export default async function LivePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LiveMapClient locale={locale} />;
}
