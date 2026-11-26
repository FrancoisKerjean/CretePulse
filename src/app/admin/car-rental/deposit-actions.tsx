"use client";
// Boutons ops d'un acompte. Client component : le confirm() du navigateur avant
// tout remboursement, et l'affichage du résultat rendu par la server action
// (un refund_failed doit se voir, jamais disparaître dans un revalidate).
import { useState, useTransition } from "react";
import {
  adminConfirmDeposit, adminDeclineDeposit, adminCancelDeposit, adminExtendDeadline,
  adminRefundConfirmed, adminLiftSuspension,
} from "./actions";

type Msg = { ok: boolean; text: string };

const BTN = "rounded-full border border-border bg-white px-3 py-1 text-xs font-bold disabled:opacity-50";

function useAction() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg | null>(null);
  const run = (confirmText: string | null, fn: () => Promise<Msg>) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      try { setMsg(await fn()); } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); }
    });
  };
  return { pending, msg, run };
}

const releaseMsg = (r: "refunded" | "not_releasable" | "refund_failed"): Msg =>
  r === "refunded" ? { ok: true, text: "Acompte remboursé, la demande est repassée en offres." }
  : r === "not_releasable" ? { ok: false, text: "Plus libérable : l'état a changé, rechargez la page." }
  : { ok: false, text: "REMBOURSEMENT ÉCHOUÉ : l'argent n'est pas parti, à reprendre dans Stripe." };

const refundMsg = (r: "refunded" | "not_refundable" | "refund_failed"): Msg =>
  r === "refunded" ? { ok: true, text: "Réservation remboursée." }
  : r === "not_refundable" ? { ok: false, text: "Plus remboursable : l'état a changé, rechargez la page." }
  : { ok: false, text: "REMBOURSEMENT ÉCHOUÉ : l'argent n'est pas parti, à reprendre dans Stripe." };

const EXTEND_REFUSED: Record<string, string> = {
  invalid_hours: "Durée invalide.",
  not_found: "Demande introuvable.",
  not_awaiting: "Plus en attente du loueur, rechargez la page.",
  changed: "L'échéance a changé entre-temps, rechargez la page.",
  beyond_pickup: "Impossible : l'échéance dépasserait la prise en charge moins la marge de 2 h.",
};

function Result({ msg }: { msg: Msg | null }) {
  if (!msg) return null;
  return (
    <p role={msg.ok ? "status" : "alert"}
       className={`mt-1 w-full text-xs ${msg.ok ? "text-ok" : "font-bold text-terracotta"}`}>
      {msg.text}
    </p>
  );
}

export function DepositActions({ requestId, bookingStatus }: { requestId: number; bookingStatus: string }) {
  const { pending, msg, run } = useAction();
  if (bookingStatus === "awaiting_partner") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <button className={BTN} disabled={pending}
          onClick={() => run("Confirmer cette réservation à la place du loueur ?", async () => {
            const r = await adminConfirmDeposit(requestId);
            return r === "confirmed" ? { ok: true, text: "Réservation confirmée." }
              : r === "already_confirmed" ? { ok: true, text: "Déjà confirmée." }
              : { ok: false, text: "Plus en attente du loueur, rechargez la page." };
          })}>Confirmer</button>
        <button className={BTN} disabled={pending}
          onClick={() => run("Refuser au nom du loueur ? L'acompte est remboursé et le refus compte contre le loueur.",
            async () => releaseMsg(await adminDeclineDeposit(requestId)))}>Refuser (loueur)</button>
        <button className={BTN} disabled={pending}
          onClick={() => run("Annuler côté ops ? L'acompte est remboursé, sans faute du loueur.",
            async () => releaseMsg(await adminCancelDeposit(requestId)))}>Annuler (ops)</button>
        {([1, 2, 4] as const).map((h) => (
          <button key={h} className={BTN} disabled={pending}
            onClick={() => run(null, async () => {
              const r = await adminExtendDeadline(requestId, h);
              return r.status === "extended"
                ? { ok: true, text: `Échéance prolongée de ${h} h.` }
                : { ok: false, text: EXTEND_REFUSED[r.reason] ?? r.reason };
            })}>+{h} h</button>
        ))}
        <Result msg={msg} />
      </div>
    );
  }
  if (bookingStatus === "confirmed") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <button className={BTN} disabled={pending}
          onClick={() => run("Rembourser : le loueur annule la réservation confirmée ?",
            async () => refundMsg(await adminRefundConfirmed(requestId, "partner_cancelled")))}>Rembourser (loueur annule)</button>
        <button className={BTN} disabled={pending}
          onClick={() => run("Rembourser côté ops (pas de voiture au comptoir) ?",
            async () => refundMsg(await adminRefundConfirmed(requestId, "ops")))}>Rembourser (ops)</button>
        <Result msg={msg} />
      </div>
    );
  }
  return null;
}

export function LiftSuspensionButton({ partnerId }: { partnerId: number }) {
  const { pending, msg, run } = useAction();
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <button className={BTN} disabled={pending}
        onClick={() => run("Lever la suspension de ce loueur ?", async () => {
          const r = await adminLiftSuspension(partnerId);
          return r.status === "lifted"
            ? { ok: true, text: r.ratesStatus === "live" ? "Suspension levée, grille en ligne." : "Suspension levée, grille en brouillon (aucune ligne de tarif)." }
            : { ok: false, text: "Ce loueur n'est plus en pause, rechargez la page." };
        })}>Lever la suspension</button>
      <Result msg={msg} />
    </span>
  );
}
