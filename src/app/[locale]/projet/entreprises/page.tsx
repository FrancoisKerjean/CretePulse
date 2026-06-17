import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { getEntreprisesCopy } from "@/lib/campagne-pro";
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
  const { meta } = getEntreprisesCopy(locale);
  return {
    title: meta.title,
    description: meta.description,
    alternates: buildAlternates(locale, "/projet/entreprises"),
    openGraph: { title: meta.title, description: meta.description, url: `${BASE_URL}/${locale}/projet/entreprises`, type: "website" },
    // En veille jusqu'a la Gate A (audience prouvee) : page live pour le demarchage
    // direct, mais non indexee tant que le volet financement n'est pas active.
    robots: { index: false, follow: true },
  };
}

export default async function ProjetEntreprisesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getEntreprisesCopy(locale);
  return (
    <>
      <AudienceSwitch locale={locale} active="entreprises" />
      <ProParcours locale={locale} copy={copy} />
    </>
  );
}
