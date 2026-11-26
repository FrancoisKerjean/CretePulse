"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CAR_CATEGORIES, portalRateSource } from "@/lib/car-catalogue";
import type { CatalogueConditions } from "@/lib/car-catalogue";
import { CAR_INCLUSION_KEYS, CAR_INCLUSION_LABELS_PARTNER } from "@/lib/car-inclusions";
import { CAR_ZONES } from "@/lib/car-partners";
import { carPickupLabel } from "@/lib/car-lead";
import { IDENTITY_TEXT_FIELDS } from "@/lib/car-partner-identity";

export interface RateDraft { category: string; period_from: string; period_to: string; min_days: string; eur_per_day: string; source: string }

const CATEGORY_LABEL: Record<string, string> = {
  city: "City car", compact: "Compact", sedan: "Sedan", automatic: "Automatic", suv: "SUV",
};
// Libellés anglais propres au portail (l'admin garde ses libellés français).
const IDENTITY_LABEL_EN: Record<string, string> = {
  legal_name: "Legal name",
  legal_form: "Legal form",
  address_line: "Address",
  postal_code: "Postal code",
  city: "City",
  country: "Country",
  vat_id: "VAT number (with country prefix)",
};
const card = { background: "#fff", border: "1px solid #DCE9EE", borderRadius: 20, padding: "24px 22px", marginBottom: 20 } as const;
const input = { padding: "9px 10px", border: "1px solid #DCE9EE", borderRadius: 10, fontSize: 14, fontFamily: "inherit", width: "100%", boxSizing: "border-box" } as const;
const label = { display: "block", fontSize: 13, fontWeight: 600, color: "#0B3954", marginBottom: 4 } as const;
const h2 = { margin: "0 0 10px", fontSize: 18, color: "#0B3954" } as const;
const btn = (bg: string) => ({ padding: "12px 18px", borderRadius: 999, border: 0, background: bg, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }) as const;
const ghost = { padding: "8px 14px", borderRadius: 999, border: "1px solid #DCE9EE", background: "#fff", color: "#0B3954", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" } as const;

type Fee = { slug: string; eur: string };

// Client : poste sur /api/car-rental/partner-portal (jeton en clair, depuis l'URL).
export function PortalForm({
  token, partnerName, identity, initialRates, initialConditions, status, suspended, fleetFullUntil, termsAccepted, termsVersion,
}: {
  token: string;
  partnerName: string;
  identity: Record<string, string>;
  initialRates: RateDraft[];
  initialConditions: CatalogueConditions;
  status: string;
  suspended: boolean;
  fleetFullUntil: string | null;
  termsAccepted: boolean;
  termsVersion: string;
}) {
  const router = useRouter();
  const [ident, setIdent] = useState(identity);
  const [rates, setRates] = useState<RateDraft[]>(initialRates);
  const c = initialConditions;
  const [models, setModels] = useState<Record<string, { model: string; gearbox: string }>>(
    Object.fromEntries(CAR_CATEGORIES.map((k) => [k, { model: c.models?.[k]?.model ?? "", gearbox: c.models?.[k]?.gearbox ?? "" }])),
  );
  const [inclusions, setInclusions] = useState<string[]>(c.inclusions ?? []);
  const [deposit, setDeposit] = useState(c.deposit_hold_eur != null ? String(c.deposit_hold_eur) : "");
  const [childSeat, setChildSeat] = useState(c.child_seat_eur_day != null ? String(c.child_seat_eur_day) : "");
  const [cancellation, setCancellation] = useState(c.cancellation_terms ?? "");
  const [fees, setFees] = useState<Fee[]>(Object.entries(c.delivery_fees ?? {}).map(([slug, eur]) => ({ slug, eur: String(eur) })));
  const [agree, setAgree] = useState(false);
  const canPublishTerms = termsAccepted || agree;
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; lines: string[] } | null>(null);

  // Une valeur modifiée n'a plus la provenance amorcée : on efface la source grise.
  const patchRate = (i: number, up: Partial<RateDraft>) => setRates((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...up, source: "" } : r)));

  async function call(body: Record<string, unknown>): Promise<{ ok: boolean; lines: string[] }> {
    try {
      const res = await fetch("/api/car-rental/partner-portal", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...body }),
      });
      const json = await res.json().catch(() => ({}));
      // Enregistré, mais un téléphone ou un e-mail a été retiré d'un texte : on le dit.
      if (res.ok && Array.isArray(json.stripped) && json.stripped.length) {
        return { ok: true, lines: [`We removed phone numbers and e-mail addresses from: ${json.stripped.join(", ")}. Customers receive your contact details once you confirm a booking.`] };
      }
      if (res.ok) return { ok: true, lines: [] };
      if (Array.isArray(json.errors)) return { ok: false, lines: json.errors };
      if (Array.isArray(json.missing)) return { ok: false, lines: [`Please complete your billing details first: ${json.missing.map((m: string) => IDENTITY_LABEL_EN[m] ?? m).join(", ")}.`] };
      return { ok: false, lines: [typeof json.error === "string" ? json.error : "Something went wrong, please try again."] };
    } catch {
      return { ok: false, lines: ["Network error, please try again."] };
    }
  }

  const conditionsPayload = () => ({
    models: Object.fromEntries(
      Object.entries(models).filter(([, v]) => v.model.trim()).map(([k, v]) => [k, { model: v.model, gearbox: v.gearbox || null }]),
    ),
    inclusions,
    deposit_hold_eur: deposit,
    child_seat_eur_day: childSeat,
    cancellation_terms: cancellation,
    delivery_fees: Object.fromEntries(fees.filter((f) => f.slug && f.eur !== "").map((f) => [f.slug, f.eur])),
  });
  const ratesPayload = () => rates.map(({ source, ...r }) => ({ ...r, source: source || null }));

  async function run(steps: Array<Record<string, unknown>>, success: string) {
    setBusy(true);
    setMsg(null);
    const notes: string[] = [];
    for (const step of steps) {
      const r = await call(step);
      if (!r.ok) { setMsg({ kind: "err", lines: r.lines }); setBusy(false); return; }
      notes.push(...r.lines);
    }
    setMsg({ kind: "ok", lines: [success, ...notes] });
    setBusy(false);
    router.refresh();
  }

  const saveIdentity = { action: "save_identity", values: ident };
  const saveRates = { action: "save_rates", rows: ratesPayload(), conditions: conditionsPayload() };
  const hasRates = rates.length > 0;

  return (
    <div>
      <p style={{ margin: "0 0 4px", color: "#008C9E", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>crete · direct</p>
      <h1 style={{ margin: "0 0 6px", fontSize: 24, color: "#0B3954" }}>{partnerName}: your 2027 prices</h1>
      <p style={{ margin: "0 0 20px", color: "#5C7886", fontSize: 14, lineHeight: 1.6 }}>
        Fill in your billing details, your price per day and your conditions. Once you accept the partner terms and publish,
        customers see your prices and can book. You can change everything here at any time.
        Status: <strong>{suspended ? "suspended" : status === "none" ? "not started" : status}</strong>
        {status === "live" && !suspended && !fleetFullUntil ? " (customers can see your prices)" : ""}
        {fleetFullUntil ? ` (hidden until ${fleetFullUntil})` : ""}.
      </p>

      <section style={card}>
        <h2 style={h2}>1. Billing details</h2>
        <p style={{ margin: "0 0 12px", color: "#5C7886", fontSize: 13 }}>Used for the commission invoice. Your VAT number must include the country prefix, for example EL801122501.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {IDENTITY_TEXT_FIELDS.map((f) => (
            <div key={f}>
              <label style={label} htmlFor={`id-${f}`}>{IDENTITY_LABEL_EN[f]}</label>
              <input id={`id-${f}`} style={input} maxLength={200} value={ident[f] ?? ""} onChange={(e) => setIdent({ ...ident, [f]: e.target.value })} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <button type="button" disabled={busy} style={ghost} onClick={() => run([saveIdentity], "Billing details saved.")}>Save billing details</button>
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>2. Price per day</h2>
        <p style={{ margin: "0 0 12px", color: "#5C7886", fontSize: 13, lineHeight: 1.6 }}>
          One line per category, period and minimum rental length. The price applies to every day of the rental; the longest minimum
          that fits the rental length wins. Periods of the same category and minimum must not overlap.
        </p>
        {/* Grille en cartes empilées sur téléphone, en lignes au-delà de 640 px (M13). */}
        <div className="hidden sm:grid gap-2 text-[12px] text-[#5C7886] mb-1" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 90px 100px auto" }}>
          <span>Category</span><span>From</span><span>To</span><span>Min. days</span><span>EUR / day</span><span />
        </div>
        <div className="flex flex-col gap-3 sm:gap-2">
          {rates.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-[#DCE9EE] sm:p-0 sm:border-0 sm:items-start sm:[grid-template-columns:1.4fr_1fr_1fr_90px_100px_auto]">
              <label className="col-span-2 sm:col-span-1 text-[12px] text-[#5C7886]">
                <span className="sm:hidden">Category</span>
                <select aria-label="Category" style={input} value={r.category} onChange={(e) => patchRate(i, { category: e.target.value })}>
                  {CAR_CATEGORIES.map((k) => <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>)}
                </select>
                {r.source ? <span className="block" style={{ color: "#8A9BA5", fontSize: 11, marginTop: 3 }}>{portalRateSource(r.source)}</span> : null}
              </label>
              <label className="text-[12px] text-[#5C7886]"><span className="sm:hidden">From</span>
                <input aria-label="From" type="date" style={input} value={r.period_from} onChange={(e) => patchRate(i, { period_from: e.target.value })} />
              </label>
              <label className="text-[12px] text-[#5C7886]"><span className="sm:hidden">To</span>
                <input aria-label="To" type="date" style={input} value={r.period_to} onChange={(e) => patchRate(i, { period_to: e.target.value })} />
              </label>
              <label className="text-[12px] text-[#5C7886]"><span className="sm:hidden">Min. days</span>
                <input aria-label="Minimum days" type="number" min={1} step={1} style={input} value={r.min_days} onChange={(e) => patchRate(i, { min_days: e.target.value })} />
              </label>
              <label className="text-[12px] text-[#5C7886]"><span className="sm:hidden">EUR / day</span>
                <input aria-label="Euro per day" type="number" min={0} step="0.5" style={input} value={r.eur_per_day} onChange={(e) => patchRate(i, { eur_per_day: e.target.value })} />
              </label>
              <div className="col-span-2 sm:col-span-1">
                <button type="button" style={ghost} aria-label="Remove line" onClick={() => setRates((cur) => cur.filter((_, idx) => idx !== i))}>Remove</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" style={{ ...ghost, marginTop: 8 }}
          onClick={() => setRates((cur) => [...cur, { category: "compact", period_from: "", period_to: "", min_days: "1", eur_per_day: "", source: "" }])}>
          Add a line
        </button>

        <h3 style={{ margin: "22px 0 8px", fontSize: 15, color: "#0B3954" }}>Your conditions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {CAR_CATEGORIES.map((k) => (
            <div key={k}>
              <label style={label}>{CATEGORY_LABEL[k]}: example model</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input aria-label={`${CATEGORY_LABEL[k]} model`} style={input} maxLength={300} placeholder="e.g. Fiat Panda" value={models[k].model}
                  onChange={(e) => setModels({ ...models, [k]: { ...models[k], model: e.target.value } })} />
                <select aria-label={`${CATEGORY_LABEL[k]} gearbox`} style={{ ...input, width: 120 }} value={models[k].gearbox}
                  onChange={(e) => setModels({ ...models, [k]: { ...models[k], gearbox: e.target.value } })}>
                  <option value="">Any</option><option value="manual">Manual</option><option value="automatic">Automatic</option>
                </select>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <span style={label}>Included in your price</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
            {CAR_INCLUSION_KEYS.map((k) => (
              <label key={k} style={{ fontSize: 14, color: "#0B3954" }}>
                <input type="checkbox" checked={inclusions.includes(k)}
                  onChange={() => setInclusions((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))} /> {CAR_INCLUSION_LABELS_PARTNER[k]}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 14 }}>
          <div><label style={label} htmlFor="deposit">Deposit held on the card (EUR)</label>
            <input id="deposit" type="number" min={0} style={input} value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
          <div><label style={label} htmlFor="seat">Child seat (EUR per day)</label>
            <input id="seat" type="number" min={0} style={input} value={childSeat} onChange={(e) => setChildSeat(e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={label} htmlFor="cancel">Cancellation terms</label>
          <input id="cancel" style={input} maxLength={300} value={cancellation} onChange={(e) => setCancellation(e.target.value)} />
        </div>
        <div style={{ marginTop: 14 }}>
          <span style={label}>Delivery fee by pickup point (EUR, leave out if free)</span>
          {fees.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <select aria-label="Pickup point" style={input} value={f.slug} onChange={(e) => setFees((cur) => cur.map((x, idx) => (idx === i ? { ...x, slug: e.target.value } : x)))}>
                <option value="">Choose…</option>
                {CAR_ZONES.map((z) => (
                  <optgroup key={z.id} label={z.label ?? z.id}>
                    {z.pickups.map((s) => <option key={s} value={s}>{carPickupLabel(s)}</option>)}
                  </optgroup>
                ))}
              </select>
              <input aria-label="Delivery fee" type="number" min={0} style={{ ...input, width: 110 }} value={f.eur} onChange={(e) => setFees((cur) => cur.map((x, idx) => (idx === i ? { ...x, eur: e.target.value } : x)))} />
              <button type="button" style={ghost} onClick={() => setFees((cur) => cur.filter((_, idx) => idx !== i))}>Remove</button>
            </div>
          ))}
          <button type="button" style={ghost} onClick={() => setFees((cur) => [...cur, { slug: "", eur: "" }])}>Add a pickup point</button>
        </div>
        <div style={{ marginTop: 16 }}>
          <button type="button" disabled={busy} style={ghost} onClick={() => run([saveRates], "Prices saved (not published yet).")}>Save prices</button>
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>3. Terms and publication</h2>
        {termsAccepted ? (
          <p style={{ margin: "0 0 12px", padding: "10px 14px", borderRadius: 12, background: "#ECFDF5", color: "#065F46", fontSize: 14 }}>
            You accepted the partner terms (version {termsVersion}).
          </p>
        ) : null}
        <p style={{ margin: "0 0 10px", fontSize: 14, color: "#0B3954" }}>
          Please read the <a href="/en/car-partner-terms" target="_blank" rel="noreferrer" style={{ color: "#008C9E" }}>2027 partner terms</a>.
        </p>
        {/* Conditions déjà acceptées : plus de case ni de bouton d'acceptation (M13). */}
        {termsAccepted ? null : (
          <label style={{ display: "block", fontSize: 14, color: "#0B3954", marginBottom: 14 }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I accept these terms
          </label>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button type="button" disabled={busy || !canPublishTerms || !hasRates || suspended} style={{ ...btn("#E2725B"), opacity: busy || !canPublishTerms || !hasRates || suspended ? 0.5 : 1 }}
            onClick={() => run([saveIdentity, saveRates, { action: "accept_terms", publish: true }], "Your prices are published.")}>
            Publish these prices
          </button>
          {termsAccepted ? null : (
            <button type="button" disabled={busy || !agree} style={{ ...btn("#0B3954"), opacity: busy || !agree ? 0.5 : 1 }}
              onClick={() => run([saveIdentity, { action: "accept_terms", publish: false }], "Terms accepted.")}>
              Accept these terms
            </button>
          )}
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>4. Fleet full</h2>
        {suspended ? (
          <p style={{ margin: 0, color: "#991B1B", fontSize: 14 }}>Your prices are suspended, contact crete.direct.</p>
        ) : fleetFullUntil ? (
          <>
            <p style={{ margin: "0 0 10px", color: "#5C7886", fontSize: 14 }}>Fleet full until {fleetFullUntil}. Your prices are hidden until then.</p>
            <button type="button" disabled={busy} style={btn("#0B3954")} onClick={() => run([{ action: "resume" }], "Your prices are back.")}>Resume</button>
          </>
        ) : (
          <>
            <p style={{ margin: "0 0 10px", color: "#5C7886", fontSize: 14 }}>No cars left? Hide your prices until a date, then they come back by themselves.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ ...label, margin: 0 }} htmlFor="until">Fleet full until</label>
              <input id="until" type="date" style={{ ...input, width: 180 }} value={until} onChange={(e) => setUntil(e.target.value)} />
              <button type="button" disabled={busy || !until} style={{ ...ghost, opacity: !until ? 0.5 : 1 }} onClick={() => run([{ action: "pause", until }], "Your prices are hidden.")}>Hide my prices</button>
            </div>
          </>
        )}
      </section>

      {msg ? (
        <div role="status" style={{ padding: "12px 16px", borderRadius: 12, fontSize: 14, lineHeight: 1.6,
          background: msg.kind === "ok" ? "#ECFDF5" : "#FEF2F2", color: msg.kind === "ok" ? "#065F46" : "#991B1B" }}>
          {msg.lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      ) : null}
    </div>
  );
}
