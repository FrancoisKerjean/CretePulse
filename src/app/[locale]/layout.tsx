import type { ReactNode } from "react";
import type { Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { playfair } from "@/app/layout";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/app/globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  const localeUrl = `${BASE_URL}/${locale}`;

  const alternates: Record<string, string> = {};
  for (const loc of routing.locales) {
    alternates[loc] = `${BASE_URL}/${loc}`;
  }
  alternates["x-default"] = `${BASE_URL}/en`;

  return {
    title: { default: t("title"), template: `%s` },
    description: t("description"),
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: localeUrl,
      languages: alternates,
    },
    openGraph: {
      siteName: "Crete Direct",
      locale: locale === "el" ? "el_GR" : locale === "fr" ? "fr_FR" : locale === "de" ? "de_DE" : "en_GB",
      type: "website",
      url: localeUrl,
      title: t("title"),
      description: t("description"),
      images: [{ url: `${BASE_URL}/api/og?title=${encodeURIComponent(t("title"))}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [`${BASE_URL}/api/og?title=${encodeURIComponent(t("title"))}`],
    },
    other: {
      "script:ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Crete Direct",
        url: "https://crete.direct",
        logo: "https://crete.direct/icon.svg",
        description: t("description"),
        areaServed: {
          "@type": "Place",
          name: "Crete, Greece",
        },
        sameAs: [],
      }),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} className={playfair.variable}>
      <body className="bg-surface text-text font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <Header />
          {children}
          <Footer />
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
