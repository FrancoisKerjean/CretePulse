"use client";

import { useState } from "react";
import type { PartnerViewState } from "@/lib/car-deposit";

export type FinalState = Exclude<PartnerViewState, "awaiting">;
export type StateTexts = Record<FinalState, { title: string; body: string }>;

/** Encadré d'état final (confirmée, refusée, expirée...). */
export function StateNotice({ text }: { text: { title: string; body: string } }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: 12, background: "#F1F5F9", color: "#334155" }}>
      <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>{text.title}</p>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{text.body}</p>
    </div>
  );
}

const button = {
  border: "none",
  borderRadius: 999,
  padding: "13px 26px",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
} as const;

// Les deux seuls gestes du loueur. Ils postent : la page, elle, ne fait que lire.
export function ConfirmButtons({ token, states }: { token: string; states: StateTexts }) {
  const [phase, setPhase] = useState<"idle" | "sending" | "error">("idle");
  const [final, setFinal] = useState<FinalState | null>(null);

  async function answer(decision: "confirm" | "decline") {
    // Irréversible pour le client : il est remboursé et la réservation libérée.
    if (decision === "decline" && !window.confirm("The customer will be refunded and this booking released. Continue?")) {
      return;
    }
    setPhase("sending");
    try {
      const r = await fetch("/api/car-rental/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, decision }),
      });
      const j = (await r.json().catch(() => ({}))) as { state?: PartnerViewState };
      if (r.ok && j.state && j.state !== "awaiting") {
        setFinal(j.state);
        return;
      }
      setPhase("error");
    } catch {
      setPhase("error");
    }
  }

  if (final) return <StateNotice text={states[final]} />;

  const sending = phase === "sending";
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={sending}
          onClick={() => answer("confirm")}
          style={{ ...button, background: "#008C9E", color: "#fff", opacity: sending ? 0.6 : 1 }}
        >
          Confirm
        </button>
        <button
          type="button"
          disabled={sending}
          onClick={() => answer("decline")}
          style={{ ...button, background: "#fff", color: "#0B3954", border: "1px solid #DCE9EE", opacity: sending ? 0.6 : 1 }}
        >
          Not available
        </button>
      </div>
      {sending ? <p role="status" style={{ margin: "12px 0 0", color: "#5C7886", fontSize: 14 }}>Sending…</p> : null}
      {phase === "error" ? (
        <p role="alert" style={{ margin: "12px 0 0", color: "#B4532A", fontSize: 14, lineHeight: 1.6 }}>
          Something went wrong. Please try again in a few minutes, or reply to our email.
        </p>
      ) : null}
    </div>
  );
}
