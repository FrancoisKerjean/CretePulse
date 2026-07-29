// /stays/terms : cadre juridique de la marketplace. crete.direct = intermediaire
// technique, ni hebergeur ni assureur. Contenu i18n dans ../content.
// Noindex tant qu'il n'y a pas d'annonce reelle (cf ../metadata.ts).
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { L, pickStaysLocale } from "../content";
import { staysMetadata } from "../metadata";

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  return staysMetadata(locale, "terms");
}

export default async function StaysTermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = L[pickStaysLocale(locale)];

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-2xl px-4 pt-10 pb-16">
        <h1 className="font-heading font-extrabold text-3xl md:text-[38px] leading-[1.1] tracking-tight text-text mb-6">
          {t.terms.h1}
        </h1>
        <div className="card-base p-6 sm:p-8 flex flex-col gap-4">
          {t.terms.paragraphs.map((p) => (
            <p key={p.strong} className="m-0 text-[15px] text-text-muted leading-relaxed">
              <strong className="font-heading font-bold text-text">{p.strong}</strong>{" "}
              {p.text}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
