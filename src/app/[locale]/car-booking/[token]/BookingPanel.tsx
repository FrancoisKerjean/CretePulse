"use client";
import { useState } from "react";
import type { CarBookingStrings } from "../content";

// Bouton de paiement de l'acompte. Sert aussi à « reprendre le paiement » quand
// une session est déjà ouverte : la route rend alors 409 avec l'URL de cette
// session (checkoutUrl), et on y renvoie le client au lieu d'en créer une autre.
export default function BookingPanel(
  { token, locale, strings, label }: { token: string; locale: string; strings: CarBookingStrings; label: string },
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/car-rental/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, locale }),
      });
      const j = await r.json();
      const next = j.url ?? j.checkoutUrl;
      if (typeof next === "string" && next) {
        window.location.assign(next);
        return;
      }
      // Codes machine posés par lib/stripe-errors : on affiche notre phrase,
      // jamais le détail renvoyé par le prestataire.
      if (j.code === "payment_provider" || j.code === "payouts_unavailable") setError(strings.errorPayment);
      else if (j.inProgress) setError(strings.pendingNoSession);
      else if (j.tooClose) setError(strings.tooClose);
      else if (j.notReady) setError(strings.notReady);
      else if (j.alreadySettled) setError(strings.errorUnavailable);
      else if (r.status === 404) setError(strings.linkInvalid);
      else setError(strings.error);
    } catch {
      setError(strings.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-base p-6 flex flex-col gap-4">
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 bg-sun text-text rounded-full px-6 py-3 text-[15px] font-heading font-bold hover:brightness-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy ? strings.redirecting : label}
      </button>

      {error && (
        <p role="status" className="m-0 text-[14px] font-heading font-bold text-terracotta">
          {error}
        </p>
      )}
    </div>
  );
}
