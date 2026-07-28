"use client";
import { useState } from "react";
import type { StaysStrings } from "../../content";

export default function BalanceButton(
  { token, locale, strings }: { token: string; locale: string; strings: StaysStrings["balance"] },
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/stays/pay-balance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, locale }),
      });
      const j = await r.json();
      if (j.url) {
        window.location.href = j.url;
        return;
      }
      setError(`${strings.error} : ${j.error ?? ""}`);
    } catch {
      setError(strings.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-base p-6 flex flex-col gap-4">
      <p className="m-0 text-[14px] text-text-muted leading-relaxed">{strings.balanceNote}</p>
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
