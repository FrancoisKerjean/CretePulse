"use client";
import { useState } from "react";
import type React from "react";
import type { StaysStrings } from "../content";
import { computeQuote } from "@/lib/stays/pricing";
import Calendar from "./Calendar";
import QuoteBreakdown from "./QuoteBreakdown";

const FIELD =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[15px] text-text outline-none focus:border-lagoon-deep transition-colors";
const LABEL = "block text-[13px] font-heading font-bold text-text mb-1.5";

/** Nuits couvertes par [from, to[. Meme convention que lib/stays/availability. */
function nightsOf(from: string, to: string): string[] {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(to + "T00:00:00Z").getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return [];
  const out: string[] = [];
  for (let t = a; t < b; t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

export default function RequestForm({
  slug,
  strings,
  quoteStrings,
  calendarStrings,
  unavailable,
  minNights,
  locale,
  basePriceEur,
  cleaningFeeEur,
  commissionRate,
}: {
  slug: string;
  strings: StaysStrings["form"];
  quoteStrings: StaysStrings["quote"];
  calendarStrings: StaysStrings["calendar"];
  unavailable: string[];
  minNights: number;
  /** Langue de la page. Voyage avec la demande : tous les emails du sejour,
   *  jusqu'au solde, partiront dans cette langue. */
  locale: string;
  /** Tarifs de l annonce, passes au devis. Aucun calcul de prix ici. */
  basePriceEur: number;
  cleaningFeeEur: number;
  commissionRate: number;
}) {
  const [f, setF] = useState({
    guestName: "",
    guestEmail: "",
    dateFrom: "",
    dateTo: "",
    pax: "2",
    message: "",
  });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Verification locale, doublee cote serveur par /api/stays/request. Elle evite au
  // voyageur de remplir tout le formulaire pour se prendre un refus a l'envoi.
  const dateIssue = ((): string | null => {
    if (!f.dateFrom || !f.dateTo) return null;
    const nights = nightsOf(f.dateFrom, f.dateTo);
    if (nights.length === 0) return null;
    if (nights.length < minNights) {
      return strings.errorMinNights.replace("{n}", String(minNights));
    }
    if (nights.some((n) => unavailable.includes(n))) return strings.errorUnavailable;
    return null;
  })();

  // Devis affiche. computeQuote appelle nightsBetween, qui LEVE si la plage est nulle
  // ou inversee : on ne l appelle que sur deux dates valides et ordonnees.
  const quote =
    f.dateFrom && f.dateTo && f.dateTo > f.dateFrom
      ? computeQuote({
          basePriceEur,
          cleaningFeeEur,
          commissionRate,
          dateFrom: f.dateFrom,
          dateTo: f.dateTo,
        })
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const r = await fetch("/api/stays/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...f, pax: Number(f.pax), slug, locale, website: "" }),
      });
      const j = await r.json();
      setState(j.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  const set =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF({ ...f, [k]: e.target.value });

  return (
    <form onSubmit={submit} className="card-base p-6 flex flex-col gap-4">
      {/* Honeypot : invisible pour l'humain, rempli par les bots. Cf api/stays/request. */}
      <input
        type="text"
        name="website"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <Calendar
        taken={unavailable}
        from={f.dateFrom}
        to={f.dateTo}
        onPick={(dateFrom, dateTo) => setF({ ...f, dateFrom, dateTo })}
        locale={locale}
        labels={{ checkIn: calendarStrings.checkIn, checkOut: calendarStrings.checkOut }}
      />

      {quote && (
        <QuoteBreakdown
          quote={quote}
          commissionRate={commissionRate}
          strings={quoteStrings}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="stay-name">{strings.name}</label>
          <input id="stay-name" className={FIELD} required value={f.guestName} onChange={set("guestName")} />
        </div>
        <div>
          <label className={LABEL} htmlFor="stay-email">{strings.email}</label>
          <input id="stay-email" className={FIELD} required type="email" value={f.guestEmail} onChange={set("guestEmail")} />
        </div>
        <div>
          <label className={LABEL} htmlFor="stay-pax">{strings.pax}</label>
          <input id="stay-pax" className={FIELD} required type="number" min={1} value={f.pax} onChange={set("pax")} />
        </div>
      </div>

      {dateIssue && (
        <p role="status" className="m-0 text-[14px] text-terracotta font-heading font-bold">
          {dateIssue}
        </p>
      )}

      <div>
        <label className={LABEL} htmlFor="stay-message">{strings.message}</label>
        <textarea
          id="stay-message"
          className={`${FIELD} min-h-24`}
          placeholder={strings.messagePlaceholder}
          value={f.message}
          onChange={set("message")}
        />
      </div>

      <button
        type="submit"
        disabled={state === "sending" || state === "sent" || dateIssue !== null}
        className="inline-flex items-center justify-center gap-2 bg-sun text-text rounded-full px-6 py-3 text-[15px] font-heading font-bold hover:brightness-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {state === "sending" ? strings.sending : strings.submit}
      </button>

      {state === "sent" && (
        <p role="status" className="m-0 text-[14px] text-ok font-heading font-bold">
          {strings.success}
        </p>
      )}
      {state === "error" && (
        <p role="status" className="m-0 text-[14px] text-terracotta font-heading font-bold">
          {strings.error}
        </p>
      )}
    </form>
  );
}
