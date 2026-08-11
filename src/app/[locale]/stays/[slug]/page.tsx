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
import { quoteForNights, formatEur } from "@/lib/stays/pricing";
import { L, pickStaysLocale, languageName } from "../content";
import { staysMetadata } from "../metadata";
import RequestForm from "./RequestForm";
import Gallery from "./Gallery";
import QuoteBreakdown from "./QuoteBreakdown";

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

  const hasRating =
    listing.rating_avg != null && listing.reviews_count != null && listing.reviews_count > 0;

  // Total du sejour le plus court REELLEMENT reservable, frais compris. La fiche
  // n affichait qu un tarif a la nuit : le voyageur multipliait de tete, oubliait
  // le minimum de nuits et le menage, et decouvrait le vrai montant au devis.
  // Meme formule que l encaissement : quoteForNights est ce que computeQuote
  // appelle, il ne peut pas y avoir deux totaux.
  const minStay = quoteForNights(minNights, {
    basePriceEur: Number(listing.base_price_eur),
    cleaningFeeEur: Number(listing.cleaning_fee_eur),
    commissionRate: Number(listing.commission_rate),
  });

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-16">
        <h1 className="font-heading font-extrabold text-3xl md:text-[40px] leading-[1.1] tracking-tight text-text mb-3">
          {listing.title}
        </h1>

        {/* Ligne de confiance, au-dessus de la ligne de flottaison. La note vivait
            sous le formulaire : l argument qui fait rester arrivait apres celui
            qui fait decider. */}
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14.5px] text-text-muted">
          {hasRating && (
            <span className="font-semibold text-text">
              {t.rating.summary
                .replace("{rating}", String(listing.rating_avg).replace(".", ","))
                .replace("{count}", String(listing.reviews_count))}
            </span>
          )}
          {facts.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>

        <Gallery photos={listing.photos ?? []} alt={listing.title ?? ""} />

        <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            {/* Les equipements passent AVANT la description : ce sont eux qui font
                retenir ou eliminer une annonce, pas le troisieme paragraphe. */}
            {amenities.length > 0 && (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
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
                  {t.langNote.replace(
                    "{lang}",
                    languageName(listing.description_locale, pickStaysLocale(locale)),
                  )}
                </p>
              )}

            {hasRating && listing.reviews_captured_at && (
              <p className="m-0 mt-4 text-[12.5px] text-text-light">
                {t.rating.source.replace(
                  "{date}",
                  listing.reviews_captured_at.slice(0, 10).split("-").reverse().join("/"),
                )}
              </p>
            )}

            <section id="request" className="mt-10 scroll-mt-6">
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

            <p className="mt-8 text-[13px]">
              <Link href={`/${locale}/stays/terms`} className="text-sea underline">
                {t.listing.termsLink}
              </Link>
            </p>

            {/* Barre de reservation, mobile seulement. Sur mobile le panneau prix
                est remonte au-dessus de la description : il sort du champ des le
                premier defilement, et il n y avait plus ni prix ni bouton pendant
                1 500 px, jusqu au formulaire. Cachee des lg, ou le panneau collant
                fait deja ce travail.

                ⛔ Posee dans la COLONNE DE GAUCHE et non a la fin de la page :
                une position collante ne s active que dans son conteneur, et cette
                colonne commence sous le panneau prix. La barre apparait donc quand
                le panneau s en va, au lieu de repeter le meme total 200 px plus bas
                sur le premier ecran.

                `sticky bottom-0` et non `fixed` : elle se range au-dessus du pied
                de page au lieu de le recouvrir pour toujours. */}
            <div className="sticky bottom-0 z-40 -mx-4 mt-10 border-t border-border bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="m-0 font-heading text-[17px] font-extrabold text-text font-data">
                    {formatEur(minStay.guestTotalEur)}
                  </p>
                  <p className="m-0 text-[12px] text-text-muted">
                    {t.calendar.minNights.replace("{n}", String(minNights))}
                  </p>
                </div>
                <a
                  href="#request"
                  className="shrink-0 rounded-full bg-sun px-5 py-2.5 text-center font-heading text-[14.5px] font-bold text-night no-underline"
                >
                  {t.listing.requestTitle}
                </a>
              </div>
            </div>
          </div>

          {/* Panneau collant : le prix suit la lecture au lieu d attendre 900 px
              plus bas. Sur mobile il reprend sa place dans le flux, au-dessus de
              la description, faute de colonne ou se coller.
              ⛔ top-24 et non top-6 : l en-tete du site est LUI AUSSI collant et
              descend jusqu a 70 px. A 24 px, les 46 premiers pixels du panneau
              passaient dessous, libelle du prix compris. Meme calage que la
              colonne collante de articles/[slug]. */}
          <aside className="card-base order-first p-5 lg:order-none lg:sticky lg:top-24">
            <p className="m-0 text-[12px] uppercase tracking-wide text-text-muted">
              {t.listing.priceLabel}
            </p>
            <p className="m-0 mt-1 font-heading font-extrabold text-3xl text-text font-data">
              {listing.base_price_eur} €
            </p>
            <p className="m-0 mt-1 text-[13px] text-text-muted">
              {t.calendar.minNights.replace("{n}", String(minNights))}
            </p>

            <QuoteBreakdown
              quote={minStay}
              commissionRate={Number(listing.commission_rate)}
              strings={t.quote}
            />

            <a
              href="#request"
              className="mt-4 block rounded-full bg-sun px-5 py-3 text-center font-heading text-[15px] font-bold text-night no-underline"
            >
              {t.listing.requestTitle}
            </a>
            <p className="m-0 mt-2.5 text-center text-[12.5px] text-text-muted">
              {t.listing.priceNote}
            </p>
          </aside>
        </div>

      </div>
    </main>
  );
}
