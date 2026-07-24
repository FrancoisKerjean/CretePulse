"use client";

import { useState } from "react";
import { CAR_INCLUSION_KEYS, CAR_INCLUSION_LABELS_PARTNER, CAR_INSURANCE_LABELS_PARTNER } from "@/lib/car-inclusions";

// Copy i18n du bouton de désistement loueur (le reste du form reste EN : les
// loueurs sont des pros locaux, l'anglais suffit — cf sendAgencyQuoteRequest).
const DECLINE_COPY: Record<string, { link: string; sending: string; done: string }> = {
  en: { link: "I can't quote this request", sending: "Sending…", done: "Noted, thank you." },
  fr: { link: "Je ne peux pas répondre à cette demande", sending: "Envoi…", done: "Noté, merci." },
  de: { link: "Ich kann diese Anfrage nicht bedienen", sending: "Senden…", done: "Notiert, danke." },
  el: { link: "Δεν μπορώ να απαντήσω σε αυτό το αίτημα", sending: "Αποστολή…", done: "Σημειώθηκε, ευχαριστούμε." },
};

const GEARBOX_CHOICES = [["automatic", "Automatic"], ["manual", "Manual"], ["", "Any"]] as const;
const INSURANCE_CHOICES: readonly (readonly [string, string])[] = [
  ["all_risk_zero", CAR_INSURANCE_LABELS_PARTNER.all_risk_zero],
  ["cdw_excess", CAR_INSURANCE_LABELS_PARTNER.cdw_excess],
  ["", "Not specified"],
];

type OptionDraft = { price: string; carModel: string; gearbox: string; inclusions: string[]; insuranceType: string; excessEur: string; zeroExcessUpsellEurDay: string };
const emptyOption = (): OptionDraft => ({ price: "", carModel: "", gearbox: "", inclusions: [], insuranceType: "", excessEur: "", zeroExcessUpsellEurDay: "" });

// Formulaire de saisie des prix par le loueur. Multi-offres : le loueur peut
// proposer plusieurs variantes (ex. manuelle vs automatique). Poste la liste +
// le jeton (en clair, depuis l'URL) à l'API qui hash et notifie le client.
export function QuoteForm({
  token,
  locale = "en",
  defaultInsuranceType = null,
  defaultExcessEur = null,
  defaultZeroExcessUpsellEurDay = null,
}: {
  token: string;
  locale?: string;
  defaultInsuranceType?: string | null;
  defaultExcessEur?: number | null;
  defaultZeroExcessUpsellEurDay?: number | null;
}) {
  // Une nouvelle option hérite des défauts d'assurance du loueur (car_partners) :
  // il déclare rarement une couverture différente d'une variante à l'autre.
  const newOption = (): OptionDraft => ({
    ...emptyOption(),
    insuranceType: defaultInsuranceType ?? "",
    excessEur: defaultExcessEur != null ? String(defaultExcessEur) : "",
    zeroExcessUpsellEurDay: defaultZeroExcessUpsellEurDay != null ? String(defaultZeroExcessUpsellEurDay) : "",
  });
  const [options, setOptions] = useState<OptionDraft[]>([newOption()]);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [decline, setDecline] = useState<"idle" | "sending" | "done">("idle");
  const d = DECLINE_COPY[locale] ?? DECLINE_COPY.en;

  const patch = (i: number, up: Partial<OptionDraft>) =>
    setOptions((cur) => cur.map((o, idx) => (idx === i ? { ...o, ...up } : o)));
  const toggleIncl = (i: number, k: string) =>
    setOptions((cur) => cur.map((o, idx) => idx !== i ? o : {
      ...o, inclusions: o.inclusions.includes(k) ? o.inclusions.filter((x) => x !== k) : [...o.inclusions, k],
    }));
  const addOption = () => setOptions((cur) => (cur.length >= 6 ? cur : [...cur, newOption()]));
  const removeOption = (i: number) => setOptions((cur) => cur.filter((_, idx) => idx !== i));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = options
      .map((o) => ({
        price: Number(o.price), carModel: o.carModel.trim() || null, gearbox: o.gearbox || null, inclusions: o.inclusions,
        insuranceType: o.insuranceType || null,
        excessEur: o.insuranceType === "cdw_excess" && o.excessEur !== "" ? Number(o.excessEur) : null,
        zeroExcessUpsellEurDay: o.insuranceType === "cdw_excess" && o.zeroExcessUpsellEurDay !== "" ? Number(o.zeroExcessUpsellEurDay) : null,
      }))
      .filter((o) => Number.isFinite(o.price) && o.price > 0);
    if (payload.length === 0) { setState("error"); return; }
    setState("sending");
    try {
      const res = await fetch("/api/car-rental/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, options: payload }),
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
        Thank you. Your {options.length > 1 ? "prices have" : "price has"} been sent to the customer. We will connect you both as soon as they accept.
      </p>
    );
  }

  const multi = options.length > 1;

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {options.map((o, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12, padding: multi ? "16px 16px 18px" : 0, borderRadius: 14, border: multi ? "1px solid #DCE9EE" : "none", background: multi ? "#F6FBFC" : "transparent" }}>
          {multi && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#008C9E", textTransform: "uppercase", letterSpacing: ".05em" }}>Option {i + 1}</span>
              <button type="button" onClick={() => removeOption(i)} style={{ border: "none", background: "transparent", color: "#94A3B8", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Remove</button>
            </div>
          )}
          <label style={{ fontSize: 14, fontWeight: 600, color: "#0B3954" }}>
            Total price for this rental
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#0B3954" }}>€</span>
            <input
              type="number" min="1" step="1" inputMode="numeric" required={i === 0}
              value={o.price} onChange={(e) => patch(i, { price: e.target.value })}
              placeholder="150"
              style={{ flex: 1, padding: "12px 14px", fontSize: 18, borderRadius: 10, border: "1px solid #DCE9EE", outline: "none" }}
            />
          </div>
          <label style={{ fontSize: 14, fontWeight: 600, color: "#0B3954" }}>Car model offered (optional)</label>
          <input
            type="text" value={o.carModel} onChange={(e) => patch(i, { carModel: e.target.value })}
            placeholder="e.g. VW Polo 2023"
            style={{ padding: "12px 14px", fontSize: 16, borderRadius: 10, border: "1px solid #DCE9EE", outline: "none" }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0B3954" }}>Gearbox</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {GEARBOX_CHOICES.map(([val, lab]) => {
              const on = o.gearbox === val;
              return (
                <button key={val || "any"} type="button" onClick={() => patch(i, { gearbox: val })}
                  style={{ padding: "8px 14px", borderRadius: 999, fontSize: 13, cursor: "pointer",
                    border: on ? "1px solid #008C9E" : "1px solid #DCE9EE",
                    background: on ? "#008C9E" : "#fff", color: on ? "#fff" : "#0B3954" }}>
                  {lab}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0B3954" }}>Included in the price (optional)</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CAR_INCLUSION_KEYS.map((k) => {
              const on = o.inclusions.includes(k);
              return (
                <button key={k} type="button" onClick={() => toggleIncl(i, k)}
                  style={{ padding: "8px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer",
                    border: on ? "1px solid #008C9E" : "1px solid #DCE9EE",
                    background: on ? "#008C9E" : "#fff", color: on ? "#fff" : "#0B3954" }}>
                  {CAR_INCLUSION_LABELS_PARTNER[k]}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0B3954" }}>Insurance included in this price</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {INSURANCE_CHOICES.map(([val, lab]) => {
              const on = o.insuranceType === val;
              return (
                <button key={val || "none"} type="button"
                  onClick={() => patch(i, val === "cdw_excess" ? { insuranceType: val } : { insuranceType: val, excessEur: "", zeroExcessUpsellEurDay: "" })}
                  style={{ padding: "8px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer",
                    border: on ? "1px solid #008C9E" : "1px solid #DCE9EE",
                    background: on ? "#008C9E" : "#fff", color: on ? "#fff" : "#0B3954" }}>
                  {lab}
                </button>
              );
            })}
          </div>
          {o.insuranceType === "cdw_excess" && (
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, color: "#5C7886", marginBottom: 6 }}>Excess / deposit (€)</label>
                <input type="number" min="0" step="1" inputMode="numeric" value={o.excessEur} onChange={(e) => patch(i, { excessEur: e.target.value })}
                  placeholder="500" style={{ width: "100%", padding: "10px 12px", fontSize: 15, borderRadius: 10, border: "1px solid #DCE9EE", outline: "none" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, color: "#5C7886", marginBottom: 6 }}>Zero-excess upgrade (€/day, optional)</label>
                <input type="number" min="0" step="1" inputMode="numeric" value={o.zeroExcessUpsellEurDay} onChange={(e) => patch(i, { zeroExcessUpsellEurDay: e.target.value })}
                  placeholder="15" style={{ width: "100%", padding: "10px 12px", fontSize: 15, borderRadius: 10, border: "1px solid #DCE9EE", outline: "none" }} />
              </div>
            </div>
          )}
        </div>
      ))}

      {options.length < 6 && (
        <button type="button" onClick={addOption}
          style={{ alignSelf: "flex-start", padding: "8px 14px", borderRadius: 999, border: "1px dashed #008C9E", background: "#fff", color: "#008C9E", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          + Add another car / price
        </button>
      )}

      <button
        type="submit" disabled={state === "sending"}
        style={{ marginTop: 2, padding: "13px 20px", borderRadius: 999, border: "none", background: "#008C9E", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: state === "sending" ? 0.6 : 1 }}
      >
        {state === "sending" ? "Sending…" : multi ? "Send my offers to the customer" : "Send my price to the customer"}
      </button>
      {state === "error" && (
        <p style={{ margin: 0, color: "#B91C1C", fontSize: 13 }}>Please enter at least one valid price and try again.</p>
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
