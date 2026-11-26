"use client";
import { useState } from "react";
import { fill, formatEur, type CarBookingStrings } from "../content";

/**
 * Qui annule : le jeton de réservation (page /car-booking) ou le jeton d'offres
 * (page /car-offer, seul lien que portent les e-mails). La route accepte l'un
 * OU l'autre, jamais les deux.
 */
export type CancelAuth = { token: string } | { offerToken: string };

export default function CancelPanel(
  { auth, strings, locale, refundEur }: {
    auth: CancelAuth;
    strings: CarBookingStrings;
    locale: string;
    /** Ce que le client récupère s'il annule maintenant, calculé côté serveur (clientCancelNowEur). */
    refundEur: number;
  },
) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [note, setNote] = useState("");
  const eur = (n: number) => formatEur(n, locale);

  async function cancel() {
    setBusy(true);
    setNote("");
    try {
      const r = await fetch("/api/car-rental/booking/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(auth),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        // Le résultat fait foi, pas l'annonce d'avant le clic : l'état a pu
        // changer entre l'affichage et le clic.
        const refunded = Number(j.refundedEur) || 0;
        setNote(refunded > 0 ? fill(strings.cancelledRefunded, { amount: eur(refunded) }) : strings.cancelledNoRefund);
        setDone(true);
        return;
      }
      if (r.status === 409) {
        setNote(strings.cancelTooLate);
        setDone(true);
        return;
      }
      setNote(strings.cancelRetry);
    } catch {
      setNote(strings.cancelRetry);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-base p-6 flex flex-col gap-4 mt-6">
      <div>
        <p className="m-0 text-[15px] font-heading font-bold text-text">{strings.cancelTitle}</p>
        {done ? null : (
          <p className="m-0 mt-1 text-[13.5px] text-text-muted leading-relaxed">
            {fill(refundEur > 0 ? strings.cancelGetBack : strings.cancelGetBackNothing, { amount: eur(refundEur) })}
          </p>
        )}
      </div>
      {done ? null : (
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="self-start inline-flex items-center justify-center bg-white text-text-muted border border-border rounded-full px-5 py-2.5 text-[14px] font-heading font-bold hover:border-text-muted transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? strings.cancelling : strings.cancelSubmit}
        </button>
      )}
      {note && (
        <p role="status" className="m-0 text-[14px] font-heading font-bold text-text">
          {note}
        </p>
      )}
    </div>
  );
}
