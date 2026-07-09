import type { ReactNode } from "react";
import type { Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ActivityNudge } from "@/components/nudge/ActivityNudge";
import { baloo, geist, comfortaa } from "@/app/layout";
import Script from "next/script";
import { buildAlternates } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
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
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });

  const alts = buildAlternates(locale);

  return {
    title: { default: t("title"), template: `%s` },
    description: t("description"),
    metadataBase: new URL(BASE_URL),
    alternates: {
      ...alts,
      types: {
        "application/rss+xml": "https://crete.direct/feed.xml",
        "application/feed+json": "https://crete.direct/feed.json",
      },
    },
    openGraph: {
      siteName: "Crete Direct",
      locale: locale === "el" ? "el_GR" : locale === "fr" ? "fr_FR" : locale === "de" ? "de_DE" : "en_GB",
      type: "website",
      url: alts.canonical,
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
    // NOTE: Organization JSON-LD is rendered as a real <script> in the body below.
    // Next.js renders `other` as <meta> tags, which Google never parses as structured data.
    robots: {
      index: true,
      follow: true,
      // Google Discover n'affiche une grande image (condition de sélection)
      // que si max-image-preview:large est explicitement autorisé.
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
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
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: "meta" });

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Crete Direct",
    url: BASE_URL,
    logo: `${BASE_URL}/icon.svg`,
    description: t("description"),
    areaServed: { "@type": "Place", name: "Crete, Greece" },
    sameAs: [],
  };

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${geist.variable} ${baloo.variable} ${comfortaa.variable}`}>
      <body className="bg-surface text-ink font-sans antialiased">
        <JsonLd data={organizationSchema} />
        <NextIntlClientProvider messages={messages}>
          <Header />
          {children}
          <Footer />
          <ActivityNudge />
        </NextIntlClientProvider>
        <Script
          defer
          data-domain="crete.direct"
          src="https://analytics.crete.direct/js/script.outbound-links.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments); }`}
        </Script>
      </body>
    </html>
  );
}
