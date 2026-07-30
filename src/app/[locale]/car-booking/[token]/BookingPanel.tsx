"use client";
import { useState } from "react";
import type { CarBookingStrings } from "../content";

export default function BookingPanel(
  { token, locale, strings }: { token: string; locale: string; strings: CarBookingStrings },
) {
  const [hasOption, setHasOption] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/car-rental/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, locale, hasOption }),
      });
      const j = await r.json();
      if (j.url) {
        window.location.href = j.url;
        return;
      }
      // Codes machine poses par lib/stripe-errors : on affiche notre phrase,
      // jamais le detail renvoye par le prestataire.
      if (j.code === "payment_provider" || j.code === "payouts_unavailable") {
        setError(strings.errorPayment);
        return;
      }
      setError(r.status === 409 ? strings.errorUnavailable : strings.error);
    } catch {
      setError(strings.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-base p-6 flex flex-col gap-5">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={hasOption}
          onChange={(e) => setHasOption(e.target.checked)}
          className="mt-1 h-4 w-4 accent-lagoon-deep"
        />
        <span>
          <span className="block text-[15px] font-heading font-bold text-text">
            {strings.optionLabel} · {strings.optionPrice}
          </span>
          <span className="block mt-1 text-[13.5px] text-text-muted leading-relaxed">
            {strings.optionHelp}
          </span>
        </span>
      </label>

      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 bg-sun text-text rounded-full px-6 py-3 text-[15px] font-heading font-bold hover:brightness-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy ? strings.redirecting : strings.submit}
      </button>

      {error && (
        <p role="status" className="m-0 text-[14px] font-heading font-bold text-terracotta">
          {error}
        </p>
      )}
    </div>
  );
}
