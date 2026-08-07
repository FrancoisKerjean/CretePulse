"use client";

import { useState } from "react";
import { isCallablePhone } from "@/lib/car-lead";

// Bouton d'acceptation d'une offre activité par le client. Poste le jeton et
// l'ID de l'invite retenue à l'API qui déclenche la mise en relation.
//
// Jumeau du bouton voiture : le téléphone est demandé ICI, au moment où le client
// accepte un prix, parce que le prestataire ne reçoit les coordonnées qu'après
// acceptation. `needsPhone` est faux quand la demande en portait déjà un.
export function AcceptButton({
  token, inviteId, label, doneText, expiredText,
  needsPhone = false, phoneLabel = "", phoneHint = "", phoneError = "",
}: {
  token: string; inviteId: number; label: string; doneText: string; expiredText: string;
  needsPhone?: boolean; phoneLabel?: string; phoneHint?: string; phoneError?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "expired" | "error" | "phone">("idle");
  const [phone, setPhone] = useState("");

  async function accept() {
    // Même règle que le serveur, pour nommer ce qui manque au lieu d'un 422 muet.
    if (needsPhone && !isCallablePhone(phone)) {
      setState("phone");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/activities/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, invite_id: inviteId, ...(needsPhone ? { phone: phone.trim() } : {}) }),
      });
      const json = await res.json();
      if (res.status === 410 || json.expired) {
        setState("expired");
      } else if (res.status === 422 && json.phoneRequired) {
        setState("phone");
      } else {
        setState(res.ok && json.ok ? "done" : "error");
      }
    } catch {
      setState("error");
    }
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
          <label htmlFor="activity-offer-phone" style={{ display: "block", marginBottom: 6, color: "#0B3954", fontSize: 14, fontWeight: 700 }}>
            {phoneLabel}
          </label>
          <input
            id="activity-offer-phone" type="tel" autoComplete="tel" inputMode="tel" required
            value={phone} onChange={(e) => { setPhone(e.target.value); if (state === "phone") setState("idle"); }}
            aria-describedby="activity-offer-phone-hint" aria-invalid={state === "phone"}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 12, fontSize: 16,
              border: `1px solid ${state === "phone" ? "#B91C1C" : "#DCE9EE"}`, color: "#0B3954", background: "#fff",
            }}
          />
          <p id="activity-offer-phone-hint" style={{ margin: "6px 0 0", color: "#5C7886", fontSize: 13, lineHeight: 1.5 }}>{phoneHint}</p>
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
