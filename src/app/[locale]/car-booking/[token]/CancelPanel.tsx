"use client";
import { useState } from "react";
import type { CarBookingStrings } from "../content";

export default function CancelPanel(
  { token, strings }: { token: string; strings: CarBookingStrings },
) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function cancel() {
    setBusy(true);
    setNote("");
    try {
      const r = await fetch("/api/car-rental/booking/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await r.json();
      if (j.ok) {
        setNote(j.refundedEur > 0 ? strings.cancelledRefunded : strings.cancelledNoRefund);
        return;
      }
      setNote(r.status === 409 ? strings.cancelTooLate : strings.errorPayment);
    } catch {
      setNote(strings.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-base p-6 flex flex-col gap-4 mt-6">
      <div>
        <p className="m-0 text-[15px] font-heading font-bold text-text">{strings.cancelTitle}</p>
        <p className="m-0 mt-1 text-[13.5px] text-text-muted leading-relaxed">{strings.cancelBody}</p>
      </div>
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className="self-start inline-flex items-center justify-center bg-white text-text-muted border border-border rounded-full px-5 py-2.5 text-[14px] font-heading font-bold hover:border-text-muted transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy ? strings.cancelling : strings.cancelSubmit}
      </button>
      {note && (
        <p role="status" className="m-0 text-[14px] font-heading font-bold text-text">
          {note}
        </p>
      )}
    </div>
  );
}
