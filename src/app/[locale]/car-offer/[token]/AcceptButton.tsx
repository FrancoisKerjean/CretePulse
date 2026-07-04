"use client";

import { useState } from "react";

// Bouton d'acceptation du devis par le client. Poste le jeton à l'API qui
// déclenche la mise en relation (coordonnées échangées par email).
export function AcceptButton({ token, label, doneText }: { token: string; label: string; doneText: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function accept() {
    setState("sending");
    try {
      const res = await fetch("/api/car-rental/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      setState(res.ok && json.ok ? "done" : "error");
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

  return (
    <div>
      <button
        onClick={accept} disabled={state === "sending"}
        style={{ width: "100%", padding: "14px 20px", borderRadius: 999, border: "none", background: "#008C9E", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", opacity: state === "sending" ? 0.6 : 1 }}
      >
        {state === "sending" ? "…" : label}
      </button>
      {state === "error" && (
        <p style={{ margin: "10px 0 0", color: "#B91C1C", fontSize: 13 }}>Something went wrong. Please try again.</p>
      )}
    </div>
  );
}
