"use client";
import { useState } from "react";
import type { StaysStrings } from "../../content";

const FIELD =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[15px] text-text outline-none focus:border-lagoon-deep transition-colors";
const LABEL = "block text-[13px] font-heading font-bold text-text mb-1.5";

type Note = { tone: "info" | "ok" | "error"; text: string } | null;

export default function ApprovePanel(
  { token, strings }: { token: string; strings: StaysStrings["approve"] },
) {
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [settled, setSettled] = useState(false);
  const [note, setNote] = useState<Note>(null);

  async function act(action: "accept" | "decline") {
    setBusy(true);
    setNote({ tone: "info", text: strings.working });
    try {
      const r = await fetch("/api/stays/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, action, price: Number(price) }),
      });
      const j = await r.json();
      // KYC juste-a-temps : Stripe Connect onboarding avant la premiere acceptation.
      if (j.kycUrl) {
        window.location.href = j.kycUrl;
        return;
      }
      if (j.approved) {
        setSettled(true);
        setNote({ tone: "ok", text: strings.accepted });
      } else if (j.declined) {
        setSettled(true);
        setNote({ tone: "ok", text: strings.declined });
      } else {
        setNote({ tone: "error", text: `${strings.error} : ${j.error ?? ""}` });
      }
    } catch {
      setNote({ tone: "error", text: strings.error });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-base p-6 flex flex-col gap-4">
      <div>
        <label className={LABEL} htmlFor="stay-approve-price">{strings.priceLabel}</label>
        <input
          id="stay-approve-price"
          className={FIELD}
          type="number"
          min={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={settled}
        />
        <p className="m-0 mt-1.5 text-[13px] text-text-muted">{strings.priceHelp}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => act("accept")}
          disabled={busy || settled || !price}
          className="inline-flex items-center justify-center gap-2 bg-sun text-text rounded-full px-6 py-3 text-[15px] font-heading font-bold hover:brightness-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {strings.accept}
        </button>
        <button
          type="button"
          onClick={() => act("decline")}
          disabled={busy || settled}
          className="inline-flex items-center justify-center gap-2 bg-white text-text-muted border border-border rounded-full px-6 py-3 text-[15px] font-heading font-bold hover:border-text-muted transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {strings.decline}
        </button>
      </div>

      {note && (
        <p
          role="status"
          className={`m-0 text-[14px] font-heading font-bold ${
            note.tone === "ok"
              ? "text-ok"
              : note.tone === "error"
                ? "text-terracotta"
                : "text-text-muted"
          }`}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}
