// /car-booking/[token] : paiement en ligne d'une location acceptee.
// Page privee servie par jeton, donc noindex, comme les pages /stays servies
// par token. Aucun contenu indexable ici.
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { L, pickCarBookingLocale } from "../content";
import BookingPanel from "./BookingPanel";
import CancelPanel from "./CancelPanel";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/car-quote";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CarBookingPage(
  { params, searchParams }: {
    params: Promise<{ locale: string; token: string }>;
    searchParams: Promise<{ paid?: string }>;
  },
) {
  const { locale, token } = await params;
  const { paid } = await searchParams;
  setRequestLocale(locale);
  const t = L[pickCarBookingLocale(locale)];

  // L'etat fait foi en base, pose par le webhook. Le parametre `paid` de Stripe
  // n'est qu'un indice : il arrive avant le webhook et ne prouve rien.
  const { data: row } = await supabaseAdmin
    .from("car_requests")
    .select("booking_status, cancellation_option")
    .eq("booking_token_hash", hashToken(token))
    .maybeSingle();

  const settled = row?.booking_status === "paid" || row?.booking_status === "transferred";
  if (settled) {
    return (
      <main className="min-h-screen bg-surface">
        <div className="mx-auto max-w-xl px-4 pt-10 pb-16">
          <h1 className="font-heading font-extrabold text-3xl md:text-[38px] leading-[1.1] tracking-tight text-text mb-3">
            {t.paidTitle}
          </h1>
          <p className="text-[15.5px] text-text-muted leading-relaxed m-0">{t.paidBody}</p>
          {/* Le bouton n'apparait que si l'annulation peut aboutir a quelque
              chose : sans option, aucun remboursement, donc rien a proposer. */}
          {row?.cancellation_option === true && row.booking_status === "paid" ? (
            <CancelPanel token={token} strings={t} />
          ) : null}
        </div>
      </main>
    );
  }

  if (paid === "1") {
    return (
      <main className="min-h-screen bg-surface">
        <div className="mx-auto max-w-xl px-4 pt-10 pb-16">
          <h1 className="font-heading font-extrabold text-3xl md:text-[38px] leading-[1.1] tracking-tight text-text mb-3">
            {t.paidTitle}
          </h1>
          <p className="text-[15.5px] text-text-muted leading-relaxed m-0">{t.paidBody}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-xl px-4 pt-10 pb-16">
        <header className="mb-7">
          <h1 className="font-heading font-extrabold text-3xl md:text-[38px] leading-[1.1] tracking-tight text-text mb-3">
            {t.h1}
          </h1>
          <p className="text-[15.5px] text-text-muted leading-relaxed m-0">{t.intro}</p>
        </header>
        <BookingPanel token={token} locale={locale} strings={t} />
      </div>
    </main>
  );
}
