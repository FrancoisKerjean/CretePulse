// /stays/[slug] : fiche d'un logement publie. Le prix affiche est le NET proprietaire,
// les 5 % de frais de paiement sont annonces avant toute demande.
// Noindex tant qu'il n'y a pas d'annonce reelle (cf ../metadata.ts).
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getListingBySlug, bookedRangesForListing } from "@/lib/stays/db";
import { unavailableNights } from "@/lib/stays/availability";
import { normalizeAmenities } from "@/lib/stays/facts";
import { L, pickStaysLocale } from "../content";
import { staysMetadata } from "../metadata";
import RequestForm from "./RequestForm";
import Gallery from "./Gallery";

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

  // Nuits deja prises, tenues a jour par la synchro iCal et par les reservations.
  // On n'affiche que celles a venir : le passe n'apprend rien au voyageur.
  const today = new Date().toISOString().slice(0, 10);
  const unavailable = unavailableNights(await bookedRangesForListing(listing.id)).filter(
    (d) => d >= today,
  );
  const minNights = Number(listing.min_nights) || 1;

  // Ligne de faits. Une valeur nulle DISPARAIT : pas de zero, pas de "n/d" sur une
  // surface voyageur. L ordre est fixe, la ponctuation est ajoutee au rendu.
  const facts: string[] = [
    listing.location_slug ? listing.location_slug.replace(/-/g, " ") : null,
    listing.max_guests ? `${listing.max_guests} ${t.facts.guests}` : null,
    listing.bedrooms ? `${listing.bedrooms} ${t.facts.bedrooms}` : null,
    listing.bathrooms ? `${listing.bathrooms} ${t.facts.bathrooms}` : null,
    listing.area_sqm ? `${listing.area_sqm} ${t.facts.area}` : null,
  ].filter((v): v is string => v !== null);

  const amenities = normalizeAmenities(listing.amenities);

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 pt-10 pb-16">
        <h1 className="font-heading font-extrabold text-3xl md:text-[40px] leading-[1.1] tracking-tight text-text mb-4">
          {listing.title}
        </h1>

        {facts.length > 0 && (
          <p className="m-0 mb-5 flex flex-wrap gap-x-3 gap-y-1 text-[14.5px] text-text-muted">
            {facts.map((f, i) => (
              <span key={f}>
                {i > 0 && <span className="mr-3 text-text-light">·</span>}
                {f}
              </span>
            ))}
          </p>
        )}

        <Gallery photos={listing.photos ?? []} alt={listing.title ?? ""} />

        {amenities.length > 0 && (
          <ul className="m-0 mt-5 flex list-none flex-wrap gap-2 p-0">
            {amenities.map((k) => (
              <li
                key={k}
                className="rounded-xl border border-border bg-white px-3 py-1.5 text-[13.5px] text-text-muted"
              >
                {t.facts.amenities[k]}
              </li>
            ))}
          </ul>
        )}

        {listing.description && (
          <p className="mt-6 text-[15.5px] text-text-muted leading-relaxed whitespace-pre-line">
            {listing.description}
          </p>
        )}

        {/* La langue de l original vient de la base, jamais d une deduction : sans
            elle, on n affiche rien. */}
        {listing.description && listing.description_locale &&
          listing.description_locale !== pickStaysLocale(locale) && (
            <p className="m-0 mt-1.5 text-[12.5px] italic text-text-light">
              {t.langNote.replace("{lang}", listing.description_locale)}
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
          <RequestForm
            slug={listing.slug}
            strings={t.form}
            quoteStrings={t.quote}
            calendarStrings={t.calendar}
            unavailable={unavailable}
            minNights={minNights}
            locale={pickStaysLocale(locale)}
            basePriceEur={Number(listing.base_price_eur)}
            cleaningFeeEur={Number(listing.cleaning_fee_eur)}
            commissionRate={Number(listing.commission_rate)}
          />
        </section>

        {/* Note relevee sur Airbnb. Aucun lien sortant : envoyer le voyageur la-bas
            lui ferait payer les frais qu on pretend lui eviter. Le bloc DISPARAIT
            s il n y a pas d avis, il n annonce jamais son propre vide. */}
        {listing.rating_avg != null &&
          listing.reviews_count != null &&
          listing.reviews_count > 0 && (
            <section className="mt-12">
              <p className="m-0 font-heading text-2xl font-extrabold text-text">
                {t.rating.summary
                  .replace("{rating}", String(listing.rating_avg).replace(".", ","))
                  .replace("{count}", String(listing.reviews_count))}
              </p>
              {listing.reviews_captured_at && (
                <p className="m-0 mt-1 text-[12.5px] text-text-light">
                  {t.rating.source.replace(
                    "{date}",
                    listing.reviews_captured_at.slice(0, 10).split("-").reverse().join("/"),
                  )}
                </p>
              )}
            </section>
          )}

        <p className="mt-8 text-[13px]">
          <Link href={`/${locale}/stays/terms`} className="text-sea underline">
            {t.listing.termsLink}
          </Link>
        </p>
      </div>
    </main>
  );
}
