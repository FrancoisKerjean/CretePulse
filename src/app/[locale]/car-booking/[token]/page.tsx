// /car-booking/[token] : acompte d'une offre choisie, puis suivi de la
// réservation (une vue par booking_status). Page privée servie par jeton, donc
// noindex, comme les pages /stays servies par token.
//
// ⛔ Aucune coordonnée du loueur avant « confirmed » : c'est la seule vue qui
// lit son téléphone, son e-mail et son adresse.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import {
  L, pickCarBookingLocale, fill, REFUND_REASON_KEY,
  type CarBookingLocale, type CarBookingStrings,
} from "../content";
import { formatEur, formatAthensDeadline, formatWallDate } from "@/lib/car-format";
import BookingPanel from "./BookingPanel";
import CancelPanel from "./CancelPanel";
import { DepositPaidBeacon } from "./DepositPaidBeacon";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/car-quote";
import { pickupLabel } from "@/lib/car-pickup-labels";
import { clientCancelNowEur, isDepositBookable, type RefundReason } from "@/lib/car-deposit";
import { CAR_INSURANCE_HEADING, insuranceSummary } from "@/lib/car-inclusions";
import { rentalDays } from "@/lib/car-pricing";
import { offerCarPhoto } from "@/lib/car-fleet";
import { partnerRatings } from "@/lib/car-trust-server";
import { OFFER_VIEW, daysLabel, localizeQuotedModel, photoAltFor } from "@/lib/car-offer-view";
import { partnerRevealed } from "@/lib/car-trust";
import { CarPhoto, RatingLine } from "@/components/car-rental/trust";
import { PartnerReveal } from "@/components/car-rental/PartnerReveal";
import GoatStanding from "@/components/campagne/GoatStanding";
import type { CarCategory } from "@/lib/car-catalogue";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const COLS =
  "status, booking_status, deposit_eur, quoted_price, quoted_car_model, quoted_insurance_type, quoted_excess_eur, quoted_zero_excess_upsell_eur_day, quoted_by_partner_id, partner_name, car_type, pickup_slug, date_from, date_to, time_from, time_to, confirm_deadline_at, refund_reason, client_token";

interface BookingRow {
  status: string;
  booking_status: string | null;
  deposit_eur: number | null;
  quoted_price: number | null;
  quoted_car_model: string | null;
  quoted_insurance_type: string | null;
  quoted_excess_eur: number | null;
  quoted_zero_excess_upsell_eur_day: number | null;
  quoted_by_partner_id: number | null;
  partner_name: string | null;
  car_type: string | null;
  pickup_slug: string | null;
  date_from: string;
  date_to: string;
  time_from: string | null;
  time_to: string | null;
  confirm_deadline_at: string | null;
  refund_reason: string | null;
  client_token: string | null;
}

/**
 * Mise en page « lagon et chèvre » (maquette B) : bandeau lagon avec titre et
 * chèvre, vague, puis la carte de la réservation et la colonne des règles.
 */
function Shell({ children, hero, wide = false }: { children?: ReactNode; hero?: ReactNode; wide?: boolean }) {
  return (
    <main className="min-h-screen bg-foam">
      {hero ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-lagoon to-sea text-white">
          <div className={`relative mx-auto flex items-end justify-between gap-6 px-4 pt-10 pb-20 ${wide ? "max-w-5xl" : "max-w-xl"}`}>
            <div className="min-w-0">{hero}</div>
            <div aria-hidden="true" className="hidden shrink-0 sm:block"><GoatStanding className="h-36 w-auto" /></div>
          </div>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true" className="absolute bottom-0 left-0 h-10 w-full text-foam">
            <path d="M0 34 C240 4 480 4 720 26 C960 48 1200 50 1440 18 V60 H0Z" fill="currentColor" />
          </svg>
        </div>
      ) : null}
      <div className={`relative mx-auto px-4 pb-16 ${hero ? "-mt-10" : "pt-10"} ${wide ? "max-w-5xl" : "max-w-xl"}`}>{children}</div>
    </main>
  );
}

function Hero({ kicker, title, lead }: { kicker?: string; title: string; lead?: ReactNode }) {
  return (
    <>
      {kicker ? <p className="m-0 mb-2 font-heading text-[12.5px] font-bold uppercase tracking-[.12em] text-white/85">{kicker}</p> : null}
      <h1 className="m-0 font-heading text-3xl font-extrabold leading-[1.1] tracking-tight md:text-[40px]">{title}</h1>
      {lead ? <p className="m-0 mt-3 max-w-xl text-[16px] leading-relaxed text-white/90">{lead}</p> : null}
    </>
  );
}

function Lead({ children }: { children: ReactNode }) {
  return <p className="text-[15.5px] text-text-muted leading-relaxed m-0">{children}</p>;
}

function Rules({ lines }: { lines: string[] }) {
  return (
    <ul className="m-0 mb-6 pl-5 flex flex-col gap-2 text-[14px] text-text-muted leading-relaxed">
      {lines.map((l) => <li key={l}>{l}</li>)}
    </ul>
  );
}

function SideBox({ title, dark = false, children }: { title?: ReactNode; dark?: boolean; children: ReactNode }) {
  return (
    <section className={`rounded-[22px] p-5 ${dark ? "bg-night text-white" : "border border-border bg-white text-ink shadow-soft"}`}>
      {title ? <h2 className={`m-0 mb-2 font-heading text-[17px] font-bold ${dark ? "text-white" : "text-ink"}`}>{title}</h2> : null}
      {children}
    </section>
  );
}

interface CardExtras { rating: { rating: number; count: number } | null }

/**
 * Carte de la réservation : vraie voiture du loueur, note, trajet, argent.
 * ⛔ Avant l'acompte (`revealed` faux) le loueur n'est pas identifiable : libellé neutre,
 * note sans nombre d'avis (attribution « Google Maps »), alt de la photo sans son nom.
 */
function BookingCard({ row, t, lang, paid, extras, revealed }: { row: BookingRow; t: CarBookingStrings; lang: CarBookingLocale; paid: boolean; extras: CardExtras; revealed: boolean }) {
  const total = Number(row.quoted_price);
  const deposit = Number(row.deposit_eur);
  const rest = Math.round((total - deposit) * 100) / 100;
  const ins = insuranceSummary(row.quoted_insurance_type, row.quoted_excess_eur, row.quoted_zero_excess_upsell_eur_day, lang);
  // Le modèle saisi porte la boîte (« VW Polo · Automatique ») : « ou similaire » suit le modèle, pas la boîte.
  const [model, ...modelRest] = (localizeQuotedModel(row.quoted_car_model, lang) ?? "").split(" · ").filter(Boolean);
  const photo = row.quoted_by_partner_id != null && row.car_type
    ? offerCarPhoto(row.quoted_by_partner_id, row.car_type as CarCategory, row.quoted_car_model)
    : null;
  const days = rentalDays(row.date_from, row.date_to, row.time_from, row.time_to);
  return (
    <section className="overflow-hidden rounded-[26px] border border-border bg-white shadow-soft">
      {photo ? (
        <div className="flex aspect-[16/9] items-center justify-center bg-white px-6 pt-6">
          <CarPhoto src640={photo.src640} src1280={photo.src1280} alt={photoAltFor(lang, photo.model ?? "", row.partner_name ?? "", revealed)} eager className="h-full w-full" sizes="(min-width: 768px) 560px, 100vw" />
        </div>
      ) : null}
      {photo && !photo.exact ? (
        <p className="m-0 px-6 pt-2 text-[12.5px] text-text-muted">{OFFER_VIEW[lang].photoOther.replace("{model}", photo.model)}</p>
      ) : null}
      <div className="flex flex-col gap-4 p-6">
        <div>
          {model ? (
            <p className="m-0 font-heading text-[22px] font-extrabold leading-tight text-ink">
              {model} <span className="font-sans text-[15px] font-medium text-text-muted">{t.orSimilar}{modelRest.length ? ` · ${modelRest.join(" · ")}` : ""}</span>
            </p>
          ) : null}
          <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14.5px] text-ink">
            {revealed ? (row.partner_name ? <span>{row.partner_name}</span> : null) : <span>{OFFER_VIEW[lang].agencyHidden}</span>}
            {extras.rating ? <RatingLine rating={extras.rating.rating} count={extras.rating.count} locale={lang} countLabel={OFFER_VIEW[lang].googleReviews} hideCount={!revealed} /> : null}
          </p>
        </div>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[15px]">
          <dt className="text-text-muted">{t.pickupRow}</dt>
          <dd className="m-0 text-right text-ink">
            {row.pickup_slug ? <span className="block">{pickupLabel(row.pickup_slug, lang)}</span> : null}
            {formatWallDate(row.date_from, row.time_from, lang)}
          </dd>
          <dt className="text-text-muted">{t.returnRow}</dt>
          <dd className="m-0 text-right text-ink">{formatWallDate(row.date_to, row.time_to, lang)}</dd>
          {ins.length ? (
            <>
              <dt className="text-text-muted">{CAR_INSURANCE_HEADING[lang] ?? CAR_INSURANCE_HEADING.en}</dt>
              <dd className="m-0 text-right text-ink">{ins.map((l) => <span key={l} className="block">{l}</span>)}</dd>
            </>
          ) : null}
        </dl>
        <div className="grid grid-cols-3 gap-2 md:gap-2.5">
          <div className={`rounded-2xl flex flex-col justify-between gap-1 px-2.5 py-2.5 md:px-3.5 md:py-3 ${paid ? "bg-ok/10" : "bg-sun/20"}`}>
            <p className="m-0 text-[12px] leading-tight text-text-muted md:text-[13px]">{paid ? t.paidShort : t.depositLabel}</p>
            <p className="m-0 whitespace-nowrap font-heading text-[17px] font-extrabold text-ink md:text-[20px]">{formatEur(deposit, lang)}</p>
          </div>
          <div className="rounded-2xl bg-sun/15 flex flex-col justify-between gap-1 px-2.5 py-2.5 md:px-3.5 md:py-3">
            <p className="m-0 text-[12px] leading-tight text-text-muted md:text-[13px]">{t.counterShort}</p>
            <p className="m-0 whitespace-nowrap font-heading text-[17px] font-extrabold text-ink md:text-[20px]">{formatEur(rest, lang)}</p>
          </div>
          <div className="rounded-2xl bg-foam flex flex-col justify-between gap-1 px-2.5 py-2.5 md:px-3.5 md:py-3">
            <p className="m-0 text-[12px] leading-tight text-text-muted md:text-[13px]">{fill(t.totalDays, { days: daysLabel(days, lang) })}</p>
            <p className="m-0 whitespace-nowrap font-heading text-[17px] font-extrabold text-ink md:text-[20px]">{formatEur(total, lang)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function CarBookingPage(
  { params, searchParams }: {
    params: Promise<{ locale: string; token: string }>;
    searchParams: Promise<{ paid?: string }>;
  },
) {
  const { locale, token } = await params;
  const { paid } = await searchParams;
  setRequestLocale(locale);
  const lang = pickCarBookingLocale(locale);
  const t = L[lang];

  // L'état fait foi en base, posé par le webhook. Le paramètre `paid` de Stripe
  // n'est qu'un indice : il arrive avant le webhook et ne prouve rien. Il ne
  // sert qu'à la mesure.
  const { data } = await supabaseAdmin
    .from("car_requests")
    .select(COLS)
    .eq("booking_token_hash", hashToken(token))
    .maybeSingle();
  const row = data as BookingRow | null;
  const beacon = paid === "1" ? <DepositPaidBeacon token={token} /> : null;

  if (!row) {
    return <Shell>{beacon}<SideBox><Lead>{t.linkInvalid}</Lead></SideBox></Shell>;
  }

  const status = row.booking_status;
  const revealed = partnerRevealed({ bookingStatus: status, requestStatus: row.status });
  const partnerName = row.partner_name ?? "";

  // Ce que rendrait une annulation maintenant ; null quand elle n'est plus
  // possible (prise passée, ou aucun acompte en jeu) : pas de panneau.
  const refundNow = clientCancelNowEur(status, Number(row.deposit_eur), row.date_from, row.time_from, Date.now());
  const cancelPanel = refundNow === null
    ? null
    : <CancelPanel auth={{ token }} strings={t} locale={lang} refundEur={refundNow} />;
  const [rated] = row.quoted_by_partner_id != null ? await partnerRatings([row.quoted_by_partner_id]) : [];
  const ratingValue = rated?.google_rating == null ? NaN : Number(rated.google_rating);
  const ratingCount = rated?.google_rating_count == null ? 0 : Number(rated.google_rating_count);
  const extras: CardExtras = { rating: Number.isFinite(ratingValue) && ratingCount > 0 ? { rating: ratingValue, count: ratingCount } : null };
  const depositText = formatEur(Number(row.deposit_eur), lang);
  // « Annulation gratuite » seulement tant qu'annuler rend tout l'acompte (I4 : à moins de 48 h, plus de titre trompeur).
  const freeNow = refundNow !== null && refundNow >= Number(row.deposit_eur);
  const cancelBox = (
    <SideBox title={freeNow ? t.freeCancelTitle : undefined}>
      <p className="m-0 text-[14px] leading-relaxed text-text-muted">{t.depositCancelRule}</p>
      {cancelPanel}
    </SideBox>
  );

  if (status === "pending_payment") {
    return (
      <Shell hero={<Hero title={t.pendingTitle} lead={t.pendingBody} />}>
        {beacon}
        {/* Au retour de Stripe, le webhook est en route : rien à reprendre. */}
        {paid === "1" ? null : (
          <SideBox>
            <BookingPanel token={token} locale={locale} strings={t} label={t.continuePayment} />
          </SideBox>
        )}
      </Shell>
    );
  }

  if (status === "awaiting_partner") {
    return (
      <Shell
        wide
        hero={
          <Hero
            kicker={fill(t.kickerPaid, { deposit: depositText })}
            title={partnerName ? fill(t.awaitingHero, { partner: partnerName }) : t.awaitingTitle}
            lead={row.confirm_deadline_at ? t.awaitingLead : t.depositConfirmRule}
          />
        }
      >
        {beacon}
        <div className="grid items-start gap-5 md:grid-cols-[1.2fr_1fr]">
          <BookingCard row={row} t={t} lang={lang} paid extras={extras} revealed={revealed} />
          <div className="flex flex-col gap-4">
            {row.confirm_deadline_at ? (
              <SideBox dark>
                <p className="m-0 mb-1 font-heading text-[12px] font-bold uppercase tracking-[.12em] text-lagoon">{t.deadlineKicker}</p>
                <p className="m-0 font-heading text-[24px] font-extrabold leading-tight text-white">
                  {formatAthensDeadline(row.confirm_deadline_at, lang)}
                </p>
                <p className="m-0 mt-2 text-[14px] leading-relaxed text-white/85">
                  {fill(t.deadlineBody, { partner: partnerName, deposit: depositText })}
                </p>
              </SideBox>
            ) : null}
            <SideBox title={t.contactTitle}>
              <p className="m-0 text-[14px] leading-relaxed text-text-muted">{fill(t.contactLocked, { partner: partnerName })}</p>
            </SideBox>
            {cancelBox}
          </div>
        </div>
        <PartnerReveal partnerId={row.quoted_by_partner_id} locale={lang} withRating={false} className="mt-6" />
      </Shell>
    );
  }

  if (status === "confirmed") {
    // Seule vue qui lit les coordonnées du loueur : la réservation est
    // confirmée, la mise en relation est due.
    const { data: partner } = await supabaseAdmin
      .from("car_partners")
      .select("name, phone, whatsapp, email, address_line, postal_code, city")
      .eq("id", row.quoted_by_partner_id)
      .maybeSingle();
    const address = [partner?.address_line, [partner?.postal_code, partner?.city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");
    return (
      <Shell
        wide
        hero={<Hero kicker={t.kickerConfirmed} title={t.confirmedTitle} lead={fill(t.confirmedBody, { partner: partner?.name ?? partnerName })} />}
      >
        {beacon}
        <div className="grid items-start gap-5 md:grid-cols-[1.2fr_1fr]">
          <BookingCard row={row} t={t} lang={lang} paid extras={extras} revealed={revealed} />
          <div className="flex flex-col gap-4">
            {partner ? (
              <SideBox title={t.contactHeading}>
                <div className="flex flex-col gap-1 text-[15px] text-ink">
                  <p className="m-0 font-heading font-bold">{partner.name}</p>
                  {partner.phone ? <a className="text-lagoon-deep" href={`tel:${partner.phone}`}>{partner.phone}</a> : null}
                  {partner.whatsapp && partner.whatsapp !== partner.phone ? (
                    <span>WhatsApp {partner.whatsapp}</span>
                  ) : null}
                  {partner.email ? <a className="text-lagoon-deep" href={`mailto:${partner.email}`}>{partner.email}</a> : null}
                  {address ? <span className="text-text-muted">{address}</span> : null}
                </div>
              </SideBox>
            ) : null}
            {cancelBox}
          </div>
        </div>
        <PartnerReveal partnerId={row.quoted_by_partner_id} locale={lang} withRating={false} className="mt-6" />
      </Shell>
    );
  }

  if (status === "refunded") {
    const reasonKey = REFUND_REASON_KEY[row.refund_reason as RefundReason];
    return (
      <Shell hero={<Hero title={t.refundedTitle} lead={reasonKey ? t[reasonKey] : undefined} />}>
        {beacon}
        <SideBox>
          <Lead>{t.refundedBody}</Lead>
          {row.client_token ? (
            <a
              href={`/${locale}/car-offer/${row.client_token}`}
              className="mt-5 inline-flex items-center justify-center bg-sun text-text rounded-full px-6 py-3 text-[15px] font-heading font-bold hover:brightness-105 transition-all"
            >
              {t.otherOffers}
            </a>
          ) : null}
        </SideBox>
      </Shell>
    );
  }

  if (status === "cancelled_kept") {
    return (
      <Shell hero={<Hero title={t.keptTitle} />}>
        {beacon}
        <SideBox><Lead>{t.keptBody}</Lead></SideBox>
      </Shell>
    );
  }

  // booking_status vide : récapitulatif et paiement, si la demande s'y prête.
  if (status !== null || row.deposit_eur == null || row.status !== "quoted") {
    return <Shell>{beacon}<SideBox><Lead>{status !== null ? t.errorUnavailable : t.notReady}</Lead></SideBox></Shell>;
  }
  const bookable = isDepositBookable(Date.now(), row.date_from, row.time_from);
  return (
    <Shell wide hero={<Hero title={t.depositTitle} lead={t.depositIntro} />}>
      {beacon}
      <div className="grid items-start gap-5 md:grid-cols-[1.2fr_1fr]">
        <BookingCard row={row} t={t} lang={lang} paid={false} extras={extras} revealed={revealed} />
        <div className="flex flex-col gap-4">
          <SideBox>
            <Rules lines={[t.depositConfirmRule, t.depositCancelRule]} />
            {bookable ? (
              <BookingPanel
                token={token}
                locale={locale}
                strings={t}
                label={fill(t.depositPay, { deposit: depositText })}
              />
            ) : (
              <p role="status" className="m-0 text-[15px] font-heading font-bold text-terracotta">{t.tooClose}</p>
            )}
          </SideBox>
        </div>
      </div>
    </Shell>
  );
}
