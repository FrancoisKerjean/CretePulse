"use client";
// Detail du devis affiche au voyageur. PRESENTATION SEULE : il recoit un StayQuote
// deja calcule par computeQuote (lib/stays/pricing), il ne fait aucune arithmetique.
// Une seule source pour la formule, sinon l affichage et l encaissement finiraient
// par diverger.
//
// ⛔ Ce montant est une ESTIMATION, et la ligne `estimate` le dit a l ecran. Le prix
// reellement encaisse est celui que le proprietaire confirme a l acceptation
// (api/stays/approve). Afficher un total sans cette mention serait un engagement de
// prix que le produit ne tient pas.
import type { StayQuote } from "@/lib/stays/types";
import { formatEur as eur } from "@/lib/stays/pricing";
import type { StaysStrings } from "../content";

export default function QuoteBreakdown({
  quote,
  commissionRate,
  strings,
}: {
  quote: StayQuote;
  commissionRate: number;
  strings: StaysStrings["quote"];
}) {
  const rows: [string, string][] = [
    [
      strings.nights
        .replace("{price}", eur(quote.basePriceEur))
        .replace("{n}", String(quote.nights)),
      eur(quote.basePriceEur * quote.nights),
    ],
  ];
  // Le menage ne s affiche que s il existe : une ligne a 0 euro n apprend rien.
  if (quote.cleaningFeeEur > 0) rows.push([strings.cleaning, eur(quote.cleaningFeeEur)]);
  rows.push([
    strings.fee.replace("{rate}", String(commissionRate)),
    eur(quote.commissionEur),
  ]);

  return (
    <div className="mt-5 border-t border-border pt-4">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between py-1 text-[14.5px] text-text-muted">
          <span>{label}</span>
          <span className="font-data">{value}</span>
        </div>
      ))}
      <div className="mt-2 flex justify-between border-t border-border pt-3 font-heading text-[17px] font-bold text-text">
        <span>{strings.total}</span>
        <span className="font-data">{eur(quote.guestTotalEur)}</span>
      </div>
      <p className="m-0 mt-3 rounded-xl bg-sea-faint px-3.5 py-2.5 text-[13.5px] text-sea">
        {strings.deposit
          .replace("{deposit}", eur(quote.depositEur))
          .replace("{balance}", eur(quote.balanceEur))}
      </p>
      <p className="m-0 mt-2 text-[12.5px] italic text-text-light">{strings.estimate}</p>
    </div>
  );
}
