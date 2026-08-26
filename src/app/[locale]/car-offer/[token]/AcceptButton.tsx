"use client";

import { useState } from "react";
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
export function AcceptButton({
  token, optionId, label, doneText, expiredText,
  needsPhone = false, phoneLabel = "", phoneHint = "", phoneError = "",
  rank = 0, offers = 0,
}: {
  token: string; optionId: number; label: string; doneText: string; expiredText: string;
  needsPhone?: boolean; phoneLabel?: string; phoneHint?: string; phoneError?: string;
  /** Rang de cette offre dans le tri par prix croissant, 1 = la moins chere. */
  rank?: number;
  /** Nombre total d'offres affichees, pour lire le rang relativement au choix offert. */
  offers?: number;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "expired" | "error" | "phone">("idle");
  const [phone, setPhone] = useState("");

  async function accept() {
    // Garde locale : même règle que le serveur (isCallablePhone), pour dire au
    // client ce qui manque au lieu de lui renvoyer un 422 muet.
    if (needsPhone && !isCallablePhone(phone)) {
      setState("phone");
      // Le client a VOULU accepter et s'est heurte a une demande de telephone.
      // Sans cette ligne ce moment n'existe nulle part, alors que c'est une
      // marche ou l'on peut perdre quelqu'un qui avait deja choisi sa voiture.
      // Trouve en cliquant, pas en relisant : la 1re version sortait ici en
      // silence. `phone_prompt` (l'ecran s'ouvre) et `phone_required` (le
      // serveur refuse) restent distincts, ils n'appellent pas le meme remede.
      track("phone_prompt");
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
      if (res.status === 410 || json.expired) {
        setState("expired");
        track("expired");
      } else if (res.status === 422 && json.phoneRequired) {
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

  return (
    <div>
      {needsPhone && (
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="offer-phone" style={{ display: "block", marginBottom: 6, color: "#0B3954", fontSize: 14, fontWeight: 700 }}>
            {phoneLabel}
          </label>
          <input
            id="offer-phone" type="tel" autoComplete="tel" inputMode="tel" required
            value={phone} onChange={(e) => { setPhone(e.target.value); if (state === "phone") setState("idle"); }}
            aria-describedby="offer-phone-hint" aria-invalid={state === "phone"}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 12, fontSize: 16,
              border: `1px solid ${state === "phone" ? "#B91C1C" : "#DCE9EE"}`, color: "#0B3954", background: "#fff",
            }}
          />
          <p id="offer-phone-hint" style={{ margin: "6px 0 0", color: "#5C7886", fontSize: 13, lineHeight: 1.5 }}>{phoneHint}</p>
        </div>
      )}
      <button
        onClick={accept} disabled={state === "sending"}
        style={{ width: "100%", padding: "14px 20px", borderRadius: 999, border: "none", background: "#008C9E", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", opacity: state === "sending" ? 0.6 : 1 }}
      >
        {state === "sending" ? "…" : label}
      </button>
      {state === "phone" && (
        <p style={{ margin: "10px 0 0", color: "#B91C1C", fontSize: 13 }}>{phoneError}</p>
      )}
      {state === "error" && (
        <p style={{ margin: "10px 0 0", color: "#B91C1C", fontSize: 13 }}>Something went wrong. Please try again.</p>
      )}
    </div>
  );
}
