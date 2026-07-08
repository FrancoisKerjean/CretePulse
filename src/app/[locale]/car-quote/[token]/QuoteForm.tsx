"use client";

import { useState } from "react";
import { CAR_INCLUSION_KEYS, CAR_INCLUSION_LABELS_PARTNER } from "@/lib/car-inclusions";

// Copy i18n du bouton de désistement loueur (le reste du form reste EN : les
// loueurs sont des pros locaux, l'anglais suffit — cf sendAgencyQuoteRequest).
const DECLINE_COPY: Record<string, { link: string; sending: string; done: string }> = {
  en: { link: "I can't quote this request", sending: "Sending…", done: "Noted, thank you." },
  fr: { link: "Je ne peux pas répondre à cette demande", sending: "Envoi…", done: "Noté, merci." },
  de: { link: "Ich kann diese Anfrage nicht bedienen", sending: "Senden…", done: "Notiert, danke." },
  el: { link: "Δεν μπορώ να απαντήσω σε αυτό το αίτημα", sending: "Αποστολή…", done: "Σημειώθηκε, ευχαριστούμε." },
};

// Formulaire de saisie du prix par le loueur. Poste le prix + le jeton (en
// clair, depuis l'URL) à l'API qui le hash et notifie le client.
export function QuoteForm({ token, locale = "en" }: { token: string; locale?: string }) {
  const [price, setPrice] = useState("");
  const [carModel, setCarModel] = useState("");
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [decline, setDecline] = useState<"idle" | "sending" | "done">("idle");
  const d = DECLINE_COPY[locale] ?? DECLINE_COPY.en;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0) { setState("error"); return; }
    setState("sending");
    try {
      const res = await fetch("/api/car-rental/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, price: value, carModel: carModel.trim() || null, inclusions }),
      });
      const json = await res.json();
      setState(res.ok && json.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  async function declineRequest() {
    setDecline("sending");
    try {
      const res = await fetch("/api/car-rental/quote?decline=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      setDecline(res.ok && json.ok ? "done" : "idle");
    } catch {
      setDecline("idle");
    }
  }

  if (decline === "done") {
    return (
      <p style={{ margin: 0, padding: "16px 18px", borderRadius: 12, background: "#F1F5F9", color: "#334155", fontSize: 15, lineHeight: 1.6 }}>
        {d.done}
      </p>
    );
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
      <label style={{ fontSize: 14, fontWeight: 600, color: "#0B3954" }}>Car model offered (optional)</label>
      <input
        type="text" value={carModel} onChange={(e) => setCarModel(e.target.value)}
        placeholder="e.g. VW Polo 2023"
        style={{ padding: "12px 14px", fontSize: 16, borderRadius: 10, border: "1px solid #DCE9EE", outline: "none" }}
      />
      <span style={{ fontSize: 14, fontWeight: 600, color: "#0B3954" }}>Included in the price (optional)</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {CAR_INCLUSION_KEYS.map((k) => {
          const on = inclusions.includes(k);
          return (
            <button key={k} type="button"
              onClick={() => setInclusions((cur) => on ? cur.filter((x) => x !== k) : [...cur, k])}
              style={{ padding: "8px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer",
                border: on ? "1px solid #008C9E" : "1px solid #DCE9EE",
                background: on ? "#008C9E" : "#fff", color: on ? "#fff" : "#0B3954" }}>
              {CAR_INCLUSION_LABELS_PARTNER[k]}
            </button>
          );
        })}
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
      <button
        type="button" onClick={declineRequest} disabled={decline === "sending"}
        style={{ marginTop: 2, padding: "8px", border: "none", background: "transparent", color: "#94A3B8", fontSize: 13, textDecoration: "underline", cursor: "pointer" }}
      >
        {decline === "sending" ? d.sending : d.link}
      </button>
    </form>
  );
}
