import type { ReactNode } from "react";
import type { Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
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
    title: { default: t("title"), template: `%s | Crete Direct` },
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
      images: [{ url: `${BASE_URL}/og-default.jpg`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [`${BASE_URL}/og-default.jpg`],
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
    <html lang={locale}>
      <body className="bg-surface text-text font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <Header />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
