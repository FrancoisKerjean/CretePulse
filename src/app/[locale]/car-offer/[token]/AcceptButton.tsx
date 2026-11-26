"use client";

import { useId, useState } from "react";
import { isCallablePhone } from "@/lib/car-lead";

// Bouton d'acceptation d'une offre par le client. Poste le jeton et l'ID de
// l'option (variante de prix) retenue à l'API qui déclenche la mise en relation.
//
// Le téléphone est demandé ICI et nulle part avant : le loueur en appel d'offres
// reçoit une demande aveugle, le numéro ne lui sert qu'une fois l'offre acceptée.
// À cet instant le client a choisi un prix, il est engagé, et un champ de plus ne
// lui fait pas abandonner ce qu'il vient de décider. Le tunnel de demande, lui,
// n'est pas touché. Déclencheur : demande 33, Zakros Tours, 9 jours de silence
// faute de numéro de rappel.
// `needsPhone` est faux pour les 62 % qui l'ont déjà donné : on ne redemande rien.
//
// Acompte (interrupteur allumé) : l'API rend `payUrl` et le client part payer ;
// ses refus (paiement déjà ouvert, trop proche du départ, acompte sous le
// minimum, loueur qui a décliné) s'affichent avec les textes de `refusals`.
// Réservation déjà payée (`booked`) : la page se recharge sur sa vue réelle.
export interface AcceptRefusals {
  inProgress: string; tooClose: string; belowMinimum: string; unavailable: string; notReady: string;
}
type Refusal = keyof AcceptRefusals;
const REFUSAL_EVENT: Record<Refusal, string> = {
  inProgress: "in_progress", tooClose: "too_close", belowMinimum: "below_minimum", unavailable: "unavailable",
  notReady: "not_ready",
};

export function AcceptButton({
  token, optionId, label, doneText, expiredText,
  needsPhone = false, phoneLabel = "", phoneHint = "", phoneError = "",
  rank = 0, offers = 0, refusals, variant = "primary", errorText = "Something went wrong. Please try again.",
}: {
  token: string; optionId: number; label: string; doneText: string; expiredText: string;
  needsPhone?: boolean; phoneLabel?: string; phoneHint?: string; phoneError?: string;
  /** Rang de cette offre dans le tri par prix croissant, 1 = la moins chere. */
  rank?: number;
  /** Nombre total d'offres affichees, pour lire le rang relativement au choix offert. */
  offers?: number;
  refusals?: AcceptRefusals;
  /** primary : grand bouton soleil (offre mise en avant) · compact : bouton de ligne. */
  variant?: "primary" | "compact";
  errorText?: string;
}) {
  const phoneId = useId();
  // M9 : le champ téléphone n'apparaît qu'au clic « Réserver » sur CETTE offre,
  // plus sous chaque carte à la fois.
  const [askPhone, setAskPhone] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "expired" | "error" | "phone" | Refusal>("idle");
  const [phone, setPhone] = useState("");

  async function accept() {
    // Garde locale : même règle que le serveur (isCallablePhone), pour dire au
    // client ce qui manque au lieu de lui renvoyer un 422 muet.
    if (needsPhone && !isCallablePhone(phone)) {
      if (!askPhone) {
        setAskPhone(true);
        track("phone_prompt");
        return;
      }
      setState("phone");
      // Le client a VOULU accepter et s'est heurte a une demande de telephone.
      // Sans cette ligne ce moment n'existe nulle part, alors que c'est une
      // marche ou l'on peut perdre quelqu'un qui avait deja choisi sa voiture.
      // Trouve en cliquant, pas en relisant : la 1re version sortait ici en
      // silence. `phone_prompt` (l'ecran s'ouvre) et `phone_required` (le
      // serveur refuse) restent distincts, ils n'appellent pas le meme remede.
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/car-rental/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, option_id: optionId, ...(needsPhone ? { phone: phone.trim() } : {}) }),
      });
      const json = await res.json();
      const refusal = (Object.keys(REFUSAL_EVENT) as Refusal[]).find((k) => json[k] === true);
      if (typeof json.payUrl === "string" && json.payUrl) {
        // Le bouton reste en « envoi » pendant la navigation vers le paiement.
        track("pay");
        window.location.assign(json.payUrl);
        return;
      } else if (res.status === 409 && json.booked === true) {
        // Réservation déjà payée (paiement rattrapé, autre onglet) : la page
        // d'offres sait afficher son état réel, on la recharge.
        track("booked");
        window.location.reload();
        return;
      } else if (res.status === 409 && refusal) {
        setState(refusal);
        track(REFUSAL_EVENT[refusal]);
      } else if (res.status === 410 || json.expired) {
        setState("expired");
        track("expired");
      } else if (res.status === 422 && json.phoneRequired) {
        setAskPhone(true);
        setState("phone");
        track("phone_required");
      } else {
        const ok = res.ok && json.ok;
        setState(ok ? "done" : "error");
        track(ok ? "ok" : "error");
      }
    } catch {
      setState("error");
      track("network_error");
    }
  }

  // UN clic, UN event, et l'issue vit dans une prop. Le contre-exemple est dans
  // le depot : `Car Wizard Submit` part a la tentative PUIS au succes, ce qui
  // rend 66 events pour 33 demandes et fait lire le double a qui l'ignore.
  function track(outcome: string) {
    window.plausible?.("car_offer_accept", {
      props: { outcome, rank: String(rank), offers: offers >= 10 ? "10+" : String(offers) },
    });
  }

  if (state === "done") {
    return (
      <p style={{ margin: 0, padding: "16px 18px", borderRadius: 12, background: "#ECFDF5", color: "#065F46", fontSize: 15, lineHeight: 1.6 }}>
        {doneText}
      </p>
    );
  }

  if (state === "expired") {
    return (
      <p style={{ margin: 0, padding: "16px 18px", borderRadius: 12, background: "#FEF9EC", color: "#92400E", fontSize: 15, lineHeight: 1.6 }}>
        {expiredText}
      </p>
    );
  }

  if (state in REFUSAL_EVENT) {
    return (
      <p role="status" style={{ margin: 0, padding: "16px 18px", borderRadius: 12, background: "#FEF9EC", color: "#92400E", fontSize: 15, lineHeight: 1.6 }}>
        {refusals?.[state as Refusal] ?? expiredText}
      </p>
    );
  }

  const showPhone = needsPhone && (askPhone || state === "phone");
  const buttonClass = variant === "compact"
    ? "inline-flex items-center justify-center rounded-full border-2 border-sea bg-white px-5 py-2 text-[14px] font-heading font-bold text-sea hover:bg-sea hover:text-white transition-colors disabled:opacity-60"
    : "w-full inline-flex items-center justify-center rounded-full bg-sun px-6 py-3.5 text-[16px] font-heading font-extrabold text-night shadow-[0_6px_18px_rgba(255,200,61,0.35)] hover:brightness-105 transition disabled:opacity-60";
  return (
    <div className={variant === "compact" ? "flex flex-col items-end gap-2" : undefined}>
      {showPhone && (
        <div className={variant === "compact" ? "w-full min-w-[220px] text-left" : "mb-3.5"}>
          <label htmlFor={phoneId} className="block mb-1.5 text-[14px] font-bold text-current">
            {phoneLabel}
          </label>
          <input
            id={phoneId} type="tel" autoComplete="tel" inputMode="tel" required autoFocus
            value={phone} onChange={(e) => { setPhone(e.target.value); if (state === "phone") setState("idle"); }}
            aria-describedby={`${phoneId}-hint`} aria-invalid={state === "phone"}
            className={`w-full rounded-xl border bg-white px-3.5 py-3 text-[16px] text-ink ${state === "phone" ? "border-alert" : "border-border"}`}
          />
          <p id={`${phoneId}-hint`} className="mt-1.5 text-[13px] leading-normal opacity-80">{phoneHint}</p>
        </div>
      )}
      <button onClick={accept} disabled={state === "sending"} className={buttonClass}>
        {state === "sending" ? "…" : label}
      </button>
      {state === "phone" && (
        <p role="alert" className="mt-2.5 text-[13px] text-alert bg-white/90 rounded-lg px-2 py-1">{phoneError}</p>
      )}
      {state === "error" && (
        <p role="alert" className="mt-2.5 text-[13px] text-alert bg-white/90 rounded-lg px-2 py-1">{errorText}</p>
      )}
    </div>
  );
}
