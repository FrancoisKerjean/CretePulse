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
  L, pickCarBookingLocale, fill, formatEur, formatAthensDeadline,
  type CarBookingLocale, type CarBookingStrings,
} from "../content";
import BookingPanel from "./BookingPanel";
import CancelPanel from "./CancelPanel";
import { DepositPaidBeacon } from "./DepositPaidBeacon";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/car-quote";
import { carPickupLabel } from "@/lib/car-lead";
import { clientCancelNowEur, isDepositBookable, type RefundReason } from "@/lib/car-deposit";
import { CAR_INSURANCE_HEADING, insuranceSummary } from "@/lib/car-inclusions";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const COLS =
  "status, booking_status, deposit_eur, quoted_price, quoted_car_model, quoted_insurance_type, quoted_excess_eur, quoted_zero_excess_upsell_eur_day, quoted_by_partner_id, partner_name, pickup_slug, date_from, date_to, time_from, confirm_deadline_at, refund_reason, client_token";

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
  pickup_slug: string | null;
  date_from: string;
  date_to: string;
  time_from: string | null;
  confirm_deadline_at: string | null;
  refund_reason: string | null;
  client_token: string | null;
}

const REASON_KEY: Record<RefundReason, keyof CarBookingStrings> = {
  partner_declined: "reasonPartnerDeclined",
  partner_timeout: "reasonPartnerTimeout",
  client_cancelled: "reasonClientCancelled",
  partner_cancelled: "reasonPartnerCancelled",
  ops: "reasonOps",
};

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-xl px-4 pt-10 pb-16">{children}</div>
    </main>
  );
}

function Title({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-heading font-extrabold text-3xl md:text-[38px] leading-[1.1] tracking-tight text-text mb-3">
      {children}
    </h1>
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

/** Récapitulatif chiffré : total, acompte, reste au comptoir, couverture. */
function Recap({ row, t, lang, paid }: { row: BookingRow; t: CarBookingStrings; lang: CarBookingLocale; paid: boolean }) {
  const total = Number(row.quoted_price);
  const deposit = Number(row.deposit_eur);
  const rest = Math.round((total - deposit) * 100) / 100;
  const ins = insuranceSummary(row.quoted_insurance_type, row.quoted_excess_eur, row.quoted_zero_excess_upsell_eur_day, lang);
  return (
    <div className="card-base p-6 flex flex-col gap-4 mb-6">
      <div>
        {row.quoted_car_model ? (
          <p className="m-0 text-[16px] font-heading font-bold text-text">{row.quoted_car_model}</p>
        ) : null}
        {row.partner_name ? <p className="m-0 mt-1 text-[14px] text-text-muted">{row.partner_name}</p> : null}
        <p className="m-0 mt-1 text-[14px] text-text-muted">
          {row.pickup_slug ? `${carPickupLabel(row.pickup_slug)} · ` : ""}{row.date_from} → {row.date_to}
        </p>
      </div>
      <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-[15px]">
        <dt className="text-text-muted">{t.totalLabel}</dt>
        <dd className="m-0 text-right font-heading font-bold text-text">{formatEur(total, lang)}</dd>
        <dt className="text-text-muted">{paid ? t.depositPaidLabel : t.depositLabel}</dt>
        <dd className="m-0 text-right font-heading font-bold text-text">{formatEur(deposit, lang)}</dd>
        <dt className="text-text-muted">{t.restLabel}</dt>
        <dd className="m-0 text-right font-heading font-bold text-text">{formatEur(rest, lang)}</dd>
      </dl>
      {ins.length ? (
        <div className="text-[14px] text-text leading-relaxed">
          <p className="m-0 mb-1 text-[12px] font-heading font-bold uppercase tracking-wide text-text-muted">
            {CAR_INSURANCE_HEADING[lang] ?? CAR_INSURANCE_HEADING.en}
          </p>
          {ins.map((x) => <div key={x}>{x}</div>)}
        </div>
      ) : null}
    </div>
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
    return <Shell>{beacon}<Lead>{t.linkInvalid}</Lead></Shell>;
  }

  const status = row.booking_status;
  const partnerName = row.partner_name ?? "";

  // Paiement total de juillet (jamais armé) : vue d'origine gardée jusqu'à son
  // retrait en tâche 15. Plus annulable en ligne : la route d'annulation ne
  // connaît que l'acompte (R45).
  if (status === "paid" || status === "transferred") {
    return (
      <Shell>
        <Title>{t.paidTitle}</Title>
        <Lead>{t.paidBody}</Lead>
      </Shell>
    );
  }

  // Ce que rendrait une annulation maintenant ; null quand elle n'est plus
  // possible (prise passée, ou aucun acompte en jeu) : pas de panneau.
  const refundNow = clientCancelNowEur(status, Number(row.deposit_eur), row.date_from, row.time_from, Date.now());
  const cancelPanel = refundNow === null
    ? null
    : <CancelPanel auth={{ token }} strings={t} locale={lang} refundEur={refundNow} />;

  if (status === "pending_payment") {
    return (
      <Shell>
        {beacon}
        <Title>{t.pendingTitle}</Title>
        <Lead>{t.pendingBody}</Lead>
        {/* Au retour de Stripe, le webhook est en route : rien à reprendre. */}
        {paid === "1" ? null : (
          <div className="mt-6">
            <BookingPanel token={token} locale={locale} strings={t} label={t.continuePayment} />
          </div>
        )}
      </Shell>
    );
  }

  if (status === "awaiting_partner") {
    return (
      <Shell>
        {beacon}
        <header className="mb-7">
          <Title>{t.awaitingTitle}</Title>
          {row.confirm_deadline_at ? (
            <Lead>
              {fill(t.awaitingBody, {
                partner: partnerName,
                deadline: formatAthensDeadline(row.confirm_deadline_at, lang),
              })}
            </Lead>
          ) : (
            <Lead>{t.depositConfirmRule}</Lead>
          )}
        </header>
        <Recap row={row} t={t} lang={lang} paid />
        <Rules lines={[t.depositCancelRule]} />
        {cancelPanel}
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
      <Shell>
        {beacon}
        <header className="mb-7">
          <Title>{t.confirmedTitle}</Title>
          <Lead>{fill(t.confirmedBody, { partner: partner?.name ?? partnerName })}</Lead>
        </header>
        <Recap row={row} t={t} lang={lang} paid />
        {partner ? (
          <div className="card-base p-6 mb-6 flex flex-col gap-1 text-[15px] text-text">
            <p className="m-0 mb-1 text-[12px] font-heading font-bold uppercase tracking-wide text-text-muted">
              {t.contactHeading}
            </p>
            <p className="m-0 font-heading font-bold">{partner.name}</p>
            {partner.phone ? <a className="text-lagoon-deep" href={`tel:${partner.phone}`}>{partner.phone}</a> : null}
            {partner.whatsapp && partner.whatsapp !== partner.phone ? (
              <span>WhatsApp {partner.whatsapp}</span>
            ) : null}
            {partner.email ? <a className="text-lagoon-deep" href={`mailto:${partner.email}`}>{partner.email}</a> : null}
            {address ? <span className="text-text-muted">{address}</span> : null}
          </div>
        ) : null}
        <Rules lines={[t.depositCancelRule]} />
        {cancelPanel}
      </Shell>
    );
  }

  if (status === "refunded") {
    const reasonKey = REASON_KEY[row.refund_reason as RefundReason];
    return (
      <Shell>
        {beacon}
        <Title>{t.refundedTitle}</Title>
        {reasonKey ? <p className="text-[15.5px] text-text leading-relaxed m-0 mb-2">{t[reasonKey]}</p> : null}
        <Lead>{t.refundedBody}</Lead>
        {row.client_token ? (
          <a
            href={`/${locale}/car-offer/${row.client_token}`}
            className="mt-6 inline-flex items-center justify-center bg-sun text-text rounded-full px-6 py-3 text-[15px] font-heading font-bold hover:brightness-105 transition-all"
          >
            {t.otherOffers}
          </a>
        ) : null}
      </Shell>
    );
  }

  if (status === "cancelled_kept") {
    return (
      <Shell>
        {beacon}
        <Title>{t.keptTitle}</Title>
        <Lead>{t.keptBody}</Lead>
      </Shell>
    );
  }

  // booking_status vide : récapitulatif et paiement, si la demande s'y prête.
  if (status !== null || row.deposit_eur == null || row.status !== "quoted") {
    return <Shell>{beacon}<Lead>{status !== null ? t.errorUnavailable : t.notReady}</Lead></Shell>;
  }
  const bookable = isDepositBookable(Date.now(), row.date_from, row.time_from);
  return (
    <Shell>
      {beacon}
      <header className="mb-7">
        <Title>{t.depositTitle}</Title>
        <Lead>{t.depositIntro}</Lead>
      </header>
      <Recap row={row} t={t} lang={lang} paid={false} />
      <Rules lines={[t.depositConfirmRule, t.depositCancelRule]} />
      {bookable ? (
        <BookingPanel
          token={token}
          locale={locale}
          strings={t}
          label={fill(t.depositPay, { deposit: formatEur(Number(row.deposit_eur), lang) })}
        />
      ) : (
        <p role="status" className="m-0 text-[15px] font-heading font-bold text-terracotta">{t.tooClose}</p>
      )}
    </Shell>
  );
}
