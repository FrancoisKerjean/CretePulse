// /stays/[slug] : fiche d'un logement publie. Le prix affiche est le NET proprietaire,
// les 5 % de frais de paiement sont annonces avant toute demande.
// Noindex tant qu'il n'y a pas d'annonce reelle (cf ../metadata.ts).
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getListingBySlug } from "@/lib/stays/db";
import { L, pickStaysLocale } from "../content";
import { staysMetadata } from "../metadata";
import RequestForm from "./RequestForm";

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; slug: string }> },
): Promise<Metadata> {
  const { locale, slug } = await params;
  const base = staysMetadata(locale, "listing");
  const listing = await getListingBySlug(slug);
  if (listing?.title) base.title = `${listing.title} · crete.direct Stays`;
  return base;
}

export default async function StayDetailPage(
  { params }: { params: Promise<{ locale: string; slug: string }> },
) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = L[pickStaysLocale(locale)];

  const listing = await getListingBySlug(slug);
  if (!listing || listing.status !== "published") notFound();

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 pt-10 pb-16">
        <h1 className="font-heading font-extrabold text-3xl md:text-[40px] leading-[1.1] tracking-tight text-text mb-4">
          {listing.title}
        </h1>

        {listing.photos?.[0] && (
          <Image
            src={listing.photos[0]}
            alt={listing.title ?? ""}
            width={1200}
            height={720}
            className="w-full rounded-3xl object-cover"
            priority
          />
        )}

        {listing.description && (
          <p className="mt-6 text-[15.5px] text-text-muted leading-relaxed whitespace-pre-line">
            {listing.description}
          </p>
        )}

        <div className="card-base mt-6 p-6">
          <p className="m-0 text-[12px] uppercase tracking-wide text-text-muted">
            {t.listing.priceLabel}
          </p>
          <p className="m-0 mt-1 font-heading font-extrabold text-3xl text-text font-data">
            {listing.base_price_eur} €
          </p>
          <p className="m-0 mt-2 text-sm text-text-muted">{t.listing.priceNote}</p>
          <p className="m-0 mt-1 text-sm text-text-muted">{t.listing.feeNote}</p>
        </div>

        <section className="mt-10">
          <h2 className="font-heading font-extrabold text-[26px] text-text mb-2">
            {t.listing.requestTitle}
          </h2>
          <p className="text-[15px] text-text-muted leading-relaxed mt-0 mb-5">
            {t.listing.requestIntro}
          </p>
          <RequestForm slug={listing.slug} strings={t.form} />
        </section>

        <p className="mt-8 text-[13px]">
          <Link href={`/${locale}/stays/terms`} className="text-sea underline">
            {t.listing.termsLink}
          </Link>
        </p>
      </div>
    </main>
  );
}
