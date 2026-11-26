"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fill, type CarBookingStrings } from "../content";
import { formatEur } from "@/lib/car-format";
import { primaryCancelAction, type CancelPhase } from "../cancel-flow";

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
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  // Montant affiché, envoyé avec le clic : le serveur refuse un résultat pire
  // (R49) et rend le montant à jour, affiché avant le second clic.
  const [expected, setExpected] = useState(refundEur);
  const [changed, setChanged] = useState(false);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<CancelPhase>("idle");
  const eur = (n: number) => formatEur(n, locale);

  async function cancel() {
    setBusy(true);
    setNote("");
    try {
      const r = await fetch("/api/car-rental/booking/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...auth, expectedRefundEur: expected }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        const refunded = Number(j.refundedEur) || 0;
        setNote(refunded > 0 ? fill(strings.cancelledRefunded, { amount: eur(refunded) }) : strings.cancelledNoRefund);
        setDone(true);
        // La page relit l'état en base et montre la vue de l'annulation.
        router.refresh();
        return;
      }
      if (r.status === 409 && j.changed) {
        setExpected(Number(j.refundEur) || 0);
        setChanged(true);
        return;
      }
      if (r.status === 409) {
        setNote(j.bookingStatus === "refunded" ? strings.cancelAlreadyRefunded : strings.cancelTooLate);
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

  // Montant changé et tombé à 0 € : on ne parle pas d'un remboursement qui n'aura pas lieu.
  const before = changed
    ? (expected > 0 ? strings.cancelChanged : strings.cancelChangedNothing)
    : expected > 0 ? strings.cancelGetBack : strings.cancelGetBackNothing;
  return (
    <div className="card-base p-6 flex flex-col gap-4 mt-6">
      <div>
        <p className="m-0 text-[15px] font-heading font-bold text-text">{strings.cancelTitle}</p>
        {done ? null : (
          <p
            role={changed || phase === "confirm" ? "status" : undefined}
            className={`m-0 mt-1 text-[13.5px] leading-relaxed ${changed || phase === "confirm" ? "font-bold text-text" : "text-text-muted"}`}
          >
            {fill(before, { amount: eur(expected) })}
          </p>
        )}
        {!done && phase === "confirm" ? (
          <p className="m-0 mt-1 text-[13.5px] leading-relaxed text-text">{strings.cancelAsk}</p>
        ) : null}
      </div>
      {done ? null : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => (primaryCancelAction(phase) === "send" ? cancel() : setPhase("confirm"))}
            disabled={busy}
            className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[14px] font-heading font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
              phase === "confirm"
                ? "bg-night text-white border border-night hover:opacity-90"
                : "bg-white text-text-muted border border-border hover:border-text-muted"
            }`}
          >
            {busy ? strings.cancelling : phase === "confirm" ? strings.cancelConfirm : strings.cancelSubmit}
          </button>
          {phase === "confirm" && !busy ? (
            <button
              type="button"
              onClick={() => { setPhase("idle"); setChanged(false); }}
              className="inline-flex items-center justify-center bg-white text-text border border-border rounded-full px-5 py-2.5 text-[14px] font-heading font-bold hover:border-text-muted transition-all"
            >
              {strings.cancelKeep}
            </button>
          ) : null}
        </div>
      )}
      {note && (
        <p role="status" className="m-0 text-[14px] font-heading font-bold text-text">
          {note}
        </p>
      )}
    </div>
  );
}
