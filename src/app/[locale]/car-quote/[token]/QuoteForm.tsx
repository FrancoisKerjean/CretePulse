"use client";

import { useState } from "react";

// Formulaire de saisie du prix par le loueur. Poste le prix + le jeton (en
// clair, depuis l'URL) à l'API qui le hash et notifie le client.
export function QuoteForm({ token }: { token: string }) {
  const [price, setPrice] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0) { setState("error"); return; }
    setState("sending");
    try {
      const res = await fetch("/api/car-rental/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, price: value }),
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
        Thank you. Your price has been sent to the customer. We will connect you both as soon as they accept.
      </p>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label style={{ fontSize: 14, fontWeight: 600, color: "#0B3954" }}>
        Your total price for this rental
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#0B3954" }}>€</span>
        <input
          type="number" min="1" step="1" inputMode="numeric" required
          value={price} onChange={(e) => setPrice(e.target.value)}
          placeholder="150"
          style={{ flex: 1, padding: "12px 14px", fontSize: 18, borderRadius: 10, border: "1px solid #DCE9EE", outline: "none" }}
        />
      </div>
      <button
        type="submit" disabled={state === "sending"}
        style={{ marginTop: 6, padding: "13px 20px", borderRadius: 999, border: "none", background: "#008C9E", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: state === "sending" ? 0.6 : 1 }}
      >
        {state === "sending" ? "Sending…" : "Send my price to the customer"}
      </button>
      {state === "error" && (
        <p style={{ margin: 0, color: "#B91C1C", fontSize: 13 }}>Something went wrong. Please check the amount and try again.</p>
      )}
    </form>
  );
}
