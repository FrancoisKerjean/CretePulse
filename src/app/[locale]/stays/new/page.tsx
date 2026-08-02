// /stays/new : onboarding proprietaire en 2 etapes (import du lien Airbnb, puis
// preuve de propriete par iCal prive avant publication).
// Noindex tant qu'il n'y a pas d'annonce reelle (cf ../metadata.ts).
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { L, pickStaysLocale } from "../content";
import { staysMetadata } from "../metadata";
import NewListingWizard from "./NewListingWizard";

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  return staysMetadata(locale, "new");
}

export default async function StaysNewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = L[pickStaysLocale(locale)];

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-2xl px-4 pt-10 pb-16">
        <header className="mb-8">
          <h1 className="font-heading font-extrabold text-4xl md:text-[42px] leading-[1.08] tracking-tight text-text mb-3">
            {t.wizard.h1}
          </h1>
          <p className="text-[15.5px] text-text-muted leading-relaxed m-0">{t.wizard.intro}</p>
        </header>
        <NewListingWizard strings={t.wizard} locale={pickStaysLocale(locale)} />
      </div>
    </main>
  );
}
