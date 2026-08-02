// /stays/approve/[token] : panneau proprietaire, atteint depuis l'email de demande.
// Le proprietaire confirme ou ajuste son prix net, ou refuse.
// Noindex (cf ../../metadata.ts) : page privee servie par token.
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getListingById, getRequestByApproveHash } from "@/lib/stays/db";
import { nightsBetween } from "@/lib/stays/pricing";
import { hashToken } from "@/lib/stays/tokens";
import { L, pickStaysLocale } from "../../content";
import { staysMetadata } from "../../metadata";
import ApprovePanel from "./ApprovePanel";

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; token: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  return staysMetadata(locale, "approve");
}

/**
 * Prix suggere dans le champ du proprietaire, en euros PAR NUIT.
 *
 * L'unite n'est pas negociable : le champ est libelle « votre prix net par nuit »
 * dans les quatre langues (content.ts), la valeur saisie part en base dans
 * `stay_requests.quoted_price_eur`, et TOUS les calculs d'encaissement
 * (approve, pay, pay-balance, webhook, owner-view) la repassent a `computeQuote`
 * comme `basePriceEur`, que la fonction multiplie elle-meme par les nuits.
 * Pre-remplir avec un total de sejour ferait donc facturer base x nuits x nuits.
 *
 * On garde quand meme `nightsBetween` comme garde de validite : il LEVE sur une
 * plage de dates incoherente. Dans ce cas, comme pour une demande ou une annonce
 * introuvable, on retombe sur 0 et le champ reste vide, exactement comme avant.
 */
async function suggestPricePerNight(token: string): Promise<number> {
  try {
    const req = await getRequestByApproveHash(hashToken(token));
    if (!req) return 0;
    const listing = await getListingById(req.listing_id);
    if (!listing) return 0;
    const nights = nightsBetween(req.date_from, req.date_to);
    const base = Number(listing.base_price_eur);
    if (nights <= 0 || !Number.isFinite(base) || base <= 0) return 0;
    return Math.round(base * 100) / 100;
  } catch {
    return 0;
  }
}

export default async function ApprovePage(
  { params }: { params: Promise<{ locale: string; token: string }> },
) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = L[pickStaysLocale(locale)];
  const suggestedPrice = await suggestPricePerNight(token);

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-xl px-4 pt-10 pb-16">
        <header className="mb-7">
          <h1 className="font-heading font-extrabold text-3xl md:text-[38px] leading-[1.1] tracking-tight text-text mb-3">
            {t.approve.h1}
          </h1>
          <p className="text-[15.5px] text-text-muted leading-relaxed m-0">{t.approve.intro}</p>
        </header>
        <ApprovePanel token={token} strings={t.approve} suggestedPrice={suggestedPrice} />
      </div>
    </main>
  );
}
