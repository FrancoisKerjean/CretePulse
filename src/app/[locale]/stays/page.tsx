// /stays : vitrine des logements publies en direct par leurs proprietaires.
// Noindex tant qu'il n'y a pas d'annonce reelle (cf ./metadata.ts).
// Contenu i18n en/fr/de/el dans ./content, fallback anglais pour les 18 autres locales.
// Spec : docs/superpowers/specs/2026-07-24-crete-direct-stays-design.md
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { L, pickStaysLocale } from "./content";
import { staysMetadata } from "./metadata";

export const revalidate = 300;

type ListingCard = {
  slug: string;
  title: string | null;
  photos: string[] | null;
  base_price_eur: number;
};

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  return staysMetadata(locale, "index");
}

export default async function StaysIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = L[pickStaysLocale(locale)];

  const { data } = await supabaseAdmin
    .from("stay_listings")
    .select("slug,title,photos,base_price_eur")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(60);
  const listings: ListingCard[] = data ?? [];

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-16">
        <header className="mb-8">
          <h1 className="font-heading font-extrabold text-4xl md:text-[44px] leading-[1.08] tracking-tight text-text mb-3">
            {t.index.h1}
          </h1>
          <p className="text-[15.5px] text-text-muted leading-relaxed m-0 max-w-2xl">
            {t.index.intro}
          </p>
          <Link
            href={`/${locale}/stays/new`}
            className="mt-5 inline-flex items-center gap-2 bg-sun text-text rounded-full px-6 py-3 text-[15px] font-heading font-bold no-underline hover:brightness-105 transition-all"
          >
            {t.index.ownerCta}
          </Link>
        </header>

        {listings.length === 0 ? (
          <div className="card-base p-7 sm:p-10 text-center">
            <p className="font-heading font-extrabold text-xl text-text m-0">{t.index.empty}</p>
            <p className="mt-2 text-[15px] text-text-muted m-0">{t.index.emptyOwner}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((l) => (
              <Link
                key={l.slug}
                href={`/${locale}/stays/${l.slug}`}
                className="card-base overflow-hidden no-underline text-inherit flex flex-col"
              >
                {l.photos?.[0] ? (
                  <Image
                    src={l.photos[0]}
                    alt={l.title ?? ""}
                    width={640}
                    height={420}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-sea-faint" />
                )}
                <div className="p-5 flex flex-col gap-1">
                  <h2 className="font-heading font-bold text-[17px] text-text m-0 leading-snug">
                    {l.title}
                  </h2>
                  <p className="m-0 font-data text-[15px] text-text">
                    {l.base_price_eur} €{" "}
                    <span className="text-text-muted text-[13px]">{t.index.perNight}</span>
                  </p>
                  <p className="m-0 text-[12.5px] text-text-muted">{t.index.feeSuffix}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
