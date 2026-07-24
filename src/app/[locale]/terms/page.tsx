import type { Locale } from "@/lib/types";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { buildAlternates } from "@/lib/seo";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const LAST_UPDATED = "2026-06-04";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const url = `${BASE_URL}/${locale}/terms`;
  const title = "Terms of Service - Crete Direct";
  const description = "Terms of Service for Crete Direct. Free, independent guide to Crete: weather, beaches, villages, events. Editorial use, no warranties, contact: hello@crete.direct.";

  return {
    title,
    description,
    alternates: buildAlternates(locale, "/terms"),
    openGraph: { title, description, url, type: "website" },
    robots: { index: true, follow: true },
  };
}

const CONTENT = {
  title: "Terms of Service",
  intro: `These Terms of Service ("Terms") govern your use of Crete Direct (crete.direct, the "Site"). By accessing or using the Site, you agree to these Terms. If you do not agree, please do not use the Site. Last updated: ${LAST_UPDATED}.`,
  sections: [
    {
      heading: "About Crete Direct",
      content: "Crete Direct is a free, independent travel and information guide focused on Crete, Greece. We publish editorial content (news, weather, beaches, villages, events, archaeology), automated daily summaries, and original media on social platforms including YouTube (@cretedirect). The Site is operated by Kairos Guest Management (NovAI SASU), based in France and Crete.",
    },
    {
      heading: "Acceptance of Terms",
      content: [
        "By accessing the Site, you confirm that you have read, understood, and agree to be bound by these Terms.",
        "If you are under the age of majority in your jurisdiction, you may only use the Site with the consent of a parent or legal guardian.",
        "We may update these Terms occasionally. Continued use of the Site after changes constitutes acceptance of the updated Terms.",
      ],
    },
    {
      heading: "Use of the Site",
      content: [
        "You agree to use the Site lawfully and respectfully.",
        "You may not attempt to disrupt, overload, or compromise the security of the Site or its underlying infrastructure.",
        "Automated scraping of the Site beyond reasonable use (RSS, sitemaps, public APIs) requires prior written consent.",
        "You may share excerpts and links to Site content, provided attribution to Crete Direct is preserved.",
      ],
    },
    {
      heading: "Editorial Content & Accuracy",
      content: [
        "Content on the Site is provided for general informational and editorial purposes only.",
        "Weather forecasts, ferry schedules, opening hours, and event listings are derived from public sources (Open-Meteo, OpenStreetMap, Copernicus, regional press, official feeds) and may change without notice.",
        "We make reasonable efforts to keep information accurate but make no warranty as to completeness, timeliness, or fitness for any particular purpose.",
        "Travel decisions (booking, safety, navigation) should always be verified against official primary sources.",
      ],
    },
    {
      heading: "Automated & AI-Generated Content",
      content: [
        "Parts of the Site (daily weather bulletins, news recaps, programmatic articles) are produced by automated pipelines and may include machine-generated text, voiceover, and video.",
        "Daily videos are published on YouTube (@cretedirect) via authorized automation. We disclose AI-assisted production where relevant.",
        "Automated content is reviewed and tuned editorially but may contain errors. Please report inaccuracies to hello@crete.direct.",
      ],
    },
    {
      heading: "Intellectual Property",
      content: [
        "All original content on the Site (text, photographs, videos, software, design) is owned by Crete Direct / Kairos Guest Management or licensed for our use, and is protected by copyright and other intellectual property laws.",
        "Third-party material (maps, weather data, sources cited inline) remains the property of its respective owners and is used under applicable licenses or fair use.",
        "You may not reproduce, redistribute, or create derivative works from substantial portions of the Site without prior written permission.",
        "The names \"Crete Direct\" and the cretedirect logo are trademarks of the operator.",
      ],
    },
    {
      heading: "User-Submitted Content",
      content: [
        "If you submit content (event, photo, tip, correction) via forms or email, you grant Crete Direct a worldwide, royalty-free, non-exclusive license to publish, edit, and distribute it on the Site and our social channels.",
        "You confirm that you own the rights to any content you submit or have permission to share it.",
        "We may decline, edit, or remove submitted content at our sole discretion.",
      ],
    },
    {
      heading: "Newsletter",
      content: [
        "Newsletter subscription is voluntary and requires double opt-in confirmation.",
        "You may unsubscribe at any time via the link in any newsletter email.",
        "See our Privacy Policy for details on how your email is stored and used.",
      ],
    },
    {
      heading: "Third-Party Links & Services",
      content: [
        "The Site links to third-party websites and services for reference (transport operators, official tourism boards, partner accommodations, social platforms).",
        "We do not endorse or assume responsibility for content, terms, or practices of third parties.",
        "Following external links is at your own risk.",
      ],
    },
    {
      heading: "Disclaimer of Warranties",
      content: "The Site is provided \"as is\" and \"as available\" without warranties of any kind, express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Site will be uninterrupted, error-free, secure, or free of harmful components.",
    },
    {
      heading: "Limitation of Liability",
      content: "To the maximum extent permitted by applicable law, Crete Direct and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the Site, even if advised of the possibility of such damages.",
    },
    {
      heading: "Indemnification",
      content: "You agree to indemnify and hold harmless Crete Direct and its operators from any claims, damages, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from your use of the Site or violation of these Terms.",
    },
    {
      heading: "Governing Law & Jurisdiction",
      content: "These Terms are governed by French law. Any dispute arising from these Terms or use of the Site shall be subject to the exclusive jurisdiction of the courts of Brest, France, unless mandatory local consumer protection laws provide otherwise.",
    },
    {
      heading: "Severability",
      content: "If any provision of these Terms is found unenforceable, the remaining provisions remain in full force and effect.",
    },
    {
      heading: "Contact",
      content: "For any question regarding these Terms, including takedown requests, licensing inquiries, or business matters, contact us at hello@crete.direct.",
    },
  ],
};

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const content = CONTENT;

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-sea mb-4">{content.title}</h1>
          <p className="text-lg text-text leading-relaxed">{content.intro}</p>
        </div>

        <div className="space-y-8">
          {content.sections.map((section, idx) => (
            <section
              key={idx}
              className="pb-8 border-b border-border last:border-b-0"
            >
              <h2 className="text-xl font-bold text-sea mb-3">{section.heading}</h2>
              {typeof section.content === "string" ? (
                <p className="text-text leading-relaxed">{section.content}</p>
              ) : (
                <ul className="space-y-2">
                  {section.content.map((item, itemIdx) => (
                    <li key={itemIdx} className="text-text leading-relaxed flex gap-3">
                      <span className="text-sea font-bold shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border flex justify-center gap-6 text-sm">
          <Link href={`/${locale}/privacy`} className="text-sea hover:underline">
            {loc === "en" ? "Privacy Policy" : loc === "fr" ? "Confidentialité" : loc === "de" ? "Datenschutz" : "Ιδιωτικότητα"}
          </Link>
          <Link href={`/${locale}/about`} className="text-sea hover:underline">
            {loc === "en" ? "About" : loc === "fr" ? "À propos" : loc === "de" ? "Über" : "Σχετικά"}
          </Link>
        </div>
      </div>
    </main>
  );
}
