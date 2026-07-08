"use client";

import { useState } from "react";

// Bouton « aucune de ces offres ne me convient » (désistement client). Ferme la
// demande côté client et coupe les relances, sans email aux loueurs.
export function DeclineButton({ token, label, doneText }: { token: string; label: string; doneText: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function decline() {
    setState("sending");
    try {
      const res = await fetch("/api/car-rental/accept?decline=1", {
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
      <p style={{ margin: "0 auto", maxWidth: 520, padding: "16px 18px", borderRadius: 12, background: "#F1F5F9", color: "#334155", fontSize: 15, lineHeight: 1.6, textAlign: "center" }}>
        {doneText}
      </p>
    );
  }

  return (
    <div style={{ textAlign: "center", marginTop: 4 }}>
      <button
        type="button" onClick={decline} disabled={state === "sending"}
        style={{ padding: "8px 12px", border: "none", background: "transparent", color: "#94A3B8", fontSize: 13, textDecoration: "underline", cursor: "pointer" }}
      >
        {state === "sending" ? "…" : label}
      </button>
      {state === "error" && (
        <p style={{ margin: "8px 0 0", color: "#B91C1C", fontSize: 13 }}>Something went wrong. Please try again.</p>
      )}
    </div>
  );
}
