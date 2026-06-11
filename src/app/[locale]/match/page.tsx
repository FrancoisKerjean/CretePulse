import { setRequestLocale } from "next-intl/server";
import { getAllCbPlaces } from "@/lib/cb-places";
import { buildAlternates } from "@/lib/seo";
import { buildMatchPool } from "@/lib/match-scoring";
import { MatchDeck } from "@/components/match/MatchDeck";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Find Your Perfect Spot in Crete - Swipe & Match",
    desc: "Swipe through beaches, gorges, monasteries and villages of Crete. Like or pass, and get matched with the spot that fits your taste.",
  },
  fr: {
    title: "Trouve Ton Spot Idéal en Crète - Swipe & Match",
    desc: "Fais défiler plages, gorges, monastères et villages de Crète. Like ou passe, et obtiens le spot qui correspond à tes goûts.",
  },
  de: {
    title: "Finde Deinen Perfekten Ort auf Kreta - Swipe & Match",
    desc: "Wische durch Strände, Schluchten, Klöster und Dörfer Kretas. Like oder weiter, und finde den Ort, der zu dir passt.",
  },
  el: {
    title: "Βρες το Ιδανικό σου Μέρος στην Κρήτη - Swipe & Match",
    desc: "Κάνε swipe σε παραλίες, φαράγγια, μοναστήρια και χωριά της Κρήτης. Like ή πέρνα, και βρες το μέρος που σου ταιριάζει.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[locale] || META.en;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/match"),
    openGraph: { title: m.title, description: m.desc, url: `${BASE_URL}/${locale}/match` },
  };
}

export default async function MatchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const places = await getAllCbPlaces().catch(() => []);
  const pool = buildMatchPool(places, 140);

  return (
    <main className="min-h-screen bg-surface">
      <MatchDeck pool={pool} locale={locale} />
    </main>
  );
}
