"use client";
import { useState } from "react";
import type { StaysStrings } from "../../content";

const FIELD =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[15px] text-text outline-none focus:border-lagoon-deep transition-colors";
const LABEL = "block text-[13px] font-heading font-bold text-text mb-1.5";

type Note = { tone: "info" | "ok" | "error"; text: string } | null;

// Pays de versement proposes. Grece en tete (le gros du parc), puis les pays des
// proprietaires non residents deja rencontres et les voisins evidents. Un pays
// absent de cette liste reste possible cote API, le champ n'est qu'un raccourci.
const PAYOUT_COUNTRIES = [
  { code: "GR", label: "Ελλάδα · Greece" },
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgique · België" },
  { code: "DE", label: "Deutschland" },
  { code: "NL", label: "Nederland" },
  { code: "GB", label: "United Kingdom" },
  { code: "IE", label: "Ireland" },
  { code: "IT", label: "Italia" },
  { code: "ES", label: "España" },
  { code: "AT", label: "Österreich" },
  { code: "CH", label: "Schweiz · Suisse" },
  { code: "SE", label: "Sverige" },
  { code: "DK", label: "Danmark" },
  { code: "NO", label: "Norge" },
  { code: "FI", label: "Suomi" },
  { code: "PL", label: "Polska" },
  { code: "CZ", label: "Česko" },
  { code: "PT", label: "Portugal" },
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
] as const;

export default function ApprovePanel(
  { token, strings, suggestedPrice = 0 }: {
    token: string;
    strings: StaysStrings["approve"];
    /** Tarif de l'annonce PAR NUIT, pre-rempli pour eviter la ressaisie. 0 = inconnu. */
    suggestedPrice?: number;
  },
) {
  // Suggestion modifiable : le proprietaire garde la main, on lui evite seulement
  // de retaper son propre tarif. Sans suggestion, le champ reste vide comme avant.
  const [price, setPrice] = useState(suggestedPrice > 0 ? String(suggestedPrice) : "");
  // Pays et type d'entite du compte de versement. Lus par Stripe Connect a la
  // premiere acceptation seulement. Ignores ensuite (le compte existe deja).
  const [country, setCountry] = useState("GR");
  const [businessType, setBusinessType] = useState<"individual" | "company">("individual");
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
        body: JSON.stringify({ token, action, price: Number(price), country, businessType }),
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
      } else if (j.code === "payouts_unavailable" || j.code === "payment_provider") {
        // Panne cote paiement : phrase complete, localisee, sans code technique.
        setNote({
          tone: "error",
          text: j.code === "payouts_unavailable" ? strings.errorPayouts : strings.errorPayment,
        });
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

      <div className="border-t border-border pt-4">
        <p className="m-0 mb-1 text-[13px] font-heading font-bold text-text">
          {strings.payoutTitle}
        </p>
        <p className="m-0 mb-3 text-[13px] text-text-muted">{strings.payoutHelp}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="stay-approve-country">
              {strings.countryLabel}
            </label>
            <select
              id="stay-approve-country"
              className={FIELD}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled={settled}
            >
              {PAYOUT_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="stay-approve-business">
              {strings.businessTypeLabel}
            </label>
            <select
              id="stay-approve-business"
              className={FIELD}
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as "individual" | "company")}
              disabled={settled}
            >
              <option value="individual">{strings.businessIndividual}</option>
              <option value="company">{strings.businessCompany}</option>
            </select>
          </div>
        </div>
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
