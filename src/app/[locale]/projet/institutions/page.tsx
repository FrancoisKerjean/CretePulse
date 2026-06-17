import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { getInstitutionsCopy } from "@/lib/campagne-pro";
import AudienceSwitch from "@/components/campagne/pro/AudienceSwitch";
import ProParcours from "@/components/campagne/pro/ProParcours";

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams(): Array<{ locale: string }> {
  return routing.locales.map((locale) => ({ locale }));
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { meta } = getInstitutionsCopy(locale);
  return {
    title: meta.title,
    description: meta.description,
    alternates: buildAlternates(locale, "/projet/institutions"),
    openGraph: { title: meta.title, description: meta.description, url: `${BASE_URL}/${locale}/projet/institutions`, type: "website" },
    // En veille jusqu'a la Gate A (audience prouvee) : page live pour le demarchage
    // direct, mais non indexee tant que le volet financement n'est pas active.
    robots: { index: false, follow: true },
  };
}

export default async function ProjetInstitutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getInstitutionsCopy(locale);
  return (
    <>
      <AudienceSwitch locale={locale} active="institutions" />
      <ProParcours locale={locale} copy={copy} />
    </>
  );
}
