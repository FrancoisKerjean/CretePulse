import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { UpdatesPage } from "@/components/updates/UpdatesPage";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isFr = locale === "fr";
  const title = isFr
    ? "Nouveautés Crete Direct - Journal produit"
    : "Crete Direct updates - Product log";
  const description = isFr
    ? "Les dernières nouveautés publiques de Crete Direct : bus, plages, activités, voiture, données live et app."
    : "The latest public Crete Direct improvements: buses, beaches, activities, car rental, live data and app work.";

  return {
    title,
    description,
    alternates: buildAlternates(locale, "/updates"),
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/updates`,
      type: "website",
    },
  };
}

export default async function UpdatesRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <UpdatesPage locale={locale} />;
}
