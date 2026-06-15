import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { getCampagneCopy } from "@/lib/campagne";
import ParcoursClient from "@/components/campagne/ParcoursClient";

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams(): Array<{ locale: string }> {
  return routing.locales.map((locale) => ({ locale }));
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { meta } = getCampagneCopy(locale);
  return {
    title: meta.title,
    description: meta.description,
    alternates: buildAlternates(locale, "/projet"),
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BASE_URL}/${locale}/projet`,
      type: "website",
    },
  };
}

export default async function ProjetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getCampagneCopy(locale);
  return <ParcoursClient locale={locale} copy={copy} />;
}
