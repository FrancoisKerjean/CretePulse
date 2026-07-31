// Vue Demandes : cartes empilées (mobile-first), filtres par query string,
// écritures par forms natifs bindés aux server actions (zéro client JS).
import {
  requestCommission, buildCarWaMessage, waHref, bookingState,
  type AdminPartner, type AdminRequest,
} from "@/lib/car-admin";
import {
  classifyInvites, partnerRelanceState, clientRelanceState, partnerRelanceRollup, buildTimeline,
  isSilentRequest, isAwaitingChoice,
  type MonitorInvite,
} from "@/lib/car-monitoring";
import { offerExpiresAt } from "@/lib/car-offer-expiry";
import { carPickupLabel } from "@/lib/car-lead";
import { CAR_TYPES_DATA } from "@/lib/car-types-data";
import { canCancelRequest } from "@/lib/car-quotes";
import { insuranceSummary, inclusionLabels } from "@/lib/car-inclusions";
import { invoiceAdminState, type AdminInvoiceRow } from "@/lib/car-invoice";
import {
  setOutcome, setCommissionPaid, saveNote, cancelRequest,
  creditInvoiceAction, resendInvoiceAction,
} from "./actions";

const PAGE_SIZE = 50;

/**
 * Etat de l'argent du voyageur sur une demande. Rien ne l'affichait : une
 * reservation payee dont le versement au loueur n'est pas parti se lisait comme
 * une demande ordinaire. La logique est pure et testee (check:car-admin), ici on
 * ne fait que l'habiller.
 */
const BOOKING_TONE: Record<"neutral" | "warn" | "ok" | "alert", string> = {
  neutral: "border border-border bg-white text-text-muted",
  warn: "border border-sun bg-white font-bold text-text",
  ok: "bg-ok font-bold text-white",
  alert: "border border-terracotta bg-terracotta-faint font-bold text-text",
};

function bookingBadge(r: AdminRequest) {
  const state = bookingState(r);
  if (!state) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${BOOKING_TONE[state.tone]}`}>
      {state.label}
    </span>
  );
}

/**
 * Etat de la facture de commission. Le ton `alert` est reserve a l envoi jamais
 * parti : la facture existe et porte son numero, mais l email a ete refuse et le
 * cron ne repassera JAMAIS dessus (il tranche l issue avant de facturer, la
 * ligne sort de son filtre des le lendemain). Le bouton « renvoyer » est le seul
 * rattrapage, il doit donc se voir.
 */
const INVOICE_TONE: Record<"alert" | "due" | "ok" | "muted", string> = {
  alert: "border border-terracotta bg-terracotta-faint font-bold text-terracotta",
  due: "border border-border bg-white text-text-muted",
  ok: "bg-ok font-bold text-white",
  muted: "border border-border bg-white text-text-light line-through",
};

/** Option de devis (variante) telle que lue par la page admin. */
export type AdminQuoteOption = {
  id: number;
  request_id: number;
  invite_id: number;
  partner_id: number;
  partner_name?: string;
  price: number;
  currency: string | null;
  car_model: string | null;
  gearbox: string | null;
  inclusions: string[] | null;
  insurance_type: string | null;
  excess_eur: number | null;
  zero_excess_upsell_eur_day: number | null;
  created_at: string | null;
};

const carTypeLabel = (id: string): string =>
  CAR_TYPES_DATA.find((c) => c.id === id)?.labels.en ?? id;

function statusBadge(st: string) {
  const cls: Record<string, string> = {
    sent: "bg-sky text-night",
    quoted: "bg-sun text-night",
    accepted: "bg-ok text-white",
    email_failed: "bg-terracotta text-white",
    declined_by_client: "bg-text-light text-white",
    cancelled: "bg-text-light text-white line-through",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cls[st] ?? "bg-border"}`}>{st}</span>;
}

function closureReasonLabel(reason?: string | null): string | null {
  const labels: Record<string, string> = {
    not_chosen: "autre offre choisie",
    client_declined_all: "client a décliné",
    client_silent: "clôture auto · client silencieux",
    rental_started: "clôture auto · date atteinte",
  };
  return reason ? labels[reason] ?? reason : null;
}

function closureReasonBadge(reason?: string | null) {
  const label = closureReasonLabel(reason);
  if (!label) return null;
  const auto = reason === "client_silent" || reason === "rental_started";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${auto ? "bg-sun text-night" : "bg-border text-text-muted"}`}>
      {label}
    </span>
  );
}

function outcomeBadge(o?: string | null) {
  if (!o) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${o === "rented" ? "bg-olive text-white" : "bg-text-light text-white"}`}>
      {o}
    </span>
  );
}

/** Lien wa.me legacy pour un partenaire en mode relay (transfert manuel). */
function relayWaLink(r: AdminRequest, p: AdminPartner | undefined) {
  if (!p || p.lead_routing !== "relay" || !(p.whatsapp ?? p.phone)) return null;
  const msg = buildCarWaMessage({
    partnerFirstName: p.name.split(" ")[0],
    pickupLabel: carPickupLabel(r.pickup_slug),
    dateFrom: r.date_from, timeFrom: r.time_from, flightNo: r.flight_no,
    dateTo: r.date_to, timeTo: r.time_to,
    carTypeLabel: carTypeLabel(r.car_type), pax: r.pax,
    customerName: r.customer_name,
    customerContact: r.customer_phone ?? r.customer_email,
  });
  return (
    <a href={waHref((p.whatsapp ?? p.phone)!, msg)} target="_blank" rel="noopener noreferrer"
       className="text-sm font-bold text-sea underline">
      WhatsApp → {p.name}
    </a>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Athens" });
}
function hoursLabel(ms: number): string {
  const h = Math.round(ms / 3600000);
  return h >= 1 ? `${h}h` : `${Math.max(1, Math.round(ms / 60000))}min`;
}

function InviteRoster({ invites, requestStatus, now, startPassed }: {
  invites: MonitorInvite[]; requestStatus: string; now: number; startPassed: boolean;
}) {
  const { quoted, silent, declined } = classifyInvites(invites);
  if (invites.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
      {quoted.map((q) => (
        <li key={q.id} className={`flex items-center gap-1.5 rounded-xl border px-3 py-1 text-sm ${q.status === "chosen" ? "border-ok bg-ok/10 font-bold" : q.status === "not_chosen" ? "border-border bg-white text-text-muted opacity-60" : "border-border bg-white text-text-muted"}`}>
          <span>{q.partner_name}</span>
          <span className="font-data">{q.quote_price} {q.quote_currency ?? "€"}</span>
          {q.quote_car_model ? <span className="text-text-light">· {q.quote_car_model}</span> : null}
          {q.quoted_at ? <span className="text-text-light">· {fmtDate(q.quoted_at)}</span> : null}
          {q.status === "chosen" && <span className="rounded-full bg-ok px-2 py-0.5 text-xs font-bold text-white">choisi par le client</span>}
          {q.status === "not_chosen" && <span className="rounded-full bg-border px-2 py-0.5 text-xs text-text-muted">non retenu</span>}
          {/* Emails de clôture loueur supprimés le 11/07/2026 : « prévenu » ne
              reste que sur l'historique, plus de « à prévenir ». */}
          {q.status === "not_chosen" && q.closed_notified_at ? <span className="rounded-full bg-lagoon/15 px-2 py-0.5 text-xs font-bold text-sea">prévenu</span> : null}
        </li>
      ))}
      {silent.map((s) => {
        const invCreatedMs = new Date(s.created_at).getTime();
        const st = partnerRelanceState(s, requestStatus, invCreatedMs, now);
        // Une location déjà commencée ne se relance plus (cohérent avec le cron car-relance).
        const badge = startPassed ? "location commencée" :
          st.kind === "relanced" ? `relancé le ${fmtDate(st.at)}` :
          st.kind === "due" ? "relance due" :
          st.kind === "dueInMs" ? `relance dans ${hoursLabel(st.ms)}` : "jamais relancé";
        const highlight = !startPassed && st.kind === "due";
        return (
          <li key={s.id} className="flex items-center gap-1.5 rounded-xl border border-dashed border-border bg-sand/40 px-3 py-1 text-sm text-text-muted">
            <span>{s.partner_name}</span>
            <span className="italic text-text-light">silencieux</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${highlight ? "bg-sun text-night font-bold" : "bg-border text-text-muted"}`}>{badge}</span>
          </li>
        );
      })}
      {declined.map((d) => (
        <li key={d.id} className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1 text-sm text-text-muted">
          <span>{d.partner_name}</span>
          <span className="rounded-full bg-border px-2 py-0.5 text-xs">ne peut pas{d.declined_at ? ` · ${fmtDate(d.declined_at)}` : ""}</span>
        </li>
      ))}
    </ul>
  );
}

/** Détail des offres envoyées par les agences : chaque option (variante) d'un
 *  devis, groupée par agence, avec assurance/franchise/inclusions. Le client ne
 *  voit que ces options ; l'admin voyait seulement le prix agrégé de l'invite. */
function OptionsDetail({ options, request }: { options: AdminQuoteOption[]; request: AdminRequest }) {
  if (options.length === 0) return null;
  const byPartner = new Map<number, AdminQuoteOption[]>();
  for (const o of options) {
    const list = byPartner.get(o.partner_id) ?? [];
    list.push(o);
    byPartner.set(o.partner_id, list);
  }
  const isChosen = (o: AdminQuoteOption) =>
    request.status === "accepted" &&
    request.quoted_by_partner_id === o.partner_id &&
    request.quoted_price === o.price &&
    (request.quoted_insurance_type == null || request.quoted_insurance_type === o.insurance_type);
  return (
    <details className="mt-2 text-sm" open={request.status === "quoted"}>
      <summary className="cursor-pointer text-text-muted underline">
        détail des offres ({options.length} option{options.length > 1 ? "s" : ""}, {byPartner.size} agence{byPartner.size > 1 ? "s" : ""})
      </summary>
      <div className="mt-2 space-y-2">
        {[...byPartner.values()].map((list) => (
          <div key={list[0].partner_id} className="rounded-xl border border-border bg-sand/30 p-3">
            <div className="font-bold">{list[0].partner_name ?? "Agency"}</div>
            <ul className="mt-1 space-y-1.5">
              {list.map((o) => {
                const insurance = insuranceSummary(o.insurance_type, o.excess_eur, o.zero_excess_upsell_eur_day, "fr");
                const incl = inclusionLabels(o.inclusions, "fr");
                return (
                  <li key={o.id} className={`rounded-lg border px-3 py-1.5 ${isChosen(o) ? "border-ok bg-ok/10" : "border-border bg-white"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-data font-bold">{o.price} {o.currency ?? "EUR"}</span>
                      {o.car_model ? <span>{o.car_model}</span> : <span className="text-text-light">modèle non précisé</span>}
                      {o.gearbox ? <span className="rounded-full bg-border px-2 py-0.5 text-xs">{o.gearbox === "automatic" ? "auto" : "manuelle"}</span> : null}
                      {isChosen(o) ? <span className="rounded-full bg-ok px-2 py-0.5 text-xs font-bold text-white">choisie par le client</span> : null}
                      {o.created_at ? <span className="ml-auto text-xs text-text-light">{fmtDate(o.created_at)}</span> : null}
                    </div>
                    {insurance.length > 0 ? (
                      <div className="mt-0.5 text-xs text-text-muted">{insurance.join(" · ")}</div>
                    ) : (
                      <div className="mt-0.5 text-xs italic text-text-light">assurance non déclarée (ancien devis)</div>
                    )}
                    {incl.length > 0 ? <div className="mt-0.5 text-xs text-text-muted">{incl.join(" · ")}</div> : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

export function RequestsTable({
  requests, partnersById, invitesByRequest, monitorByRequest, optionsByRequest, invoicesByRequest, statusFilter, partnerFilter, page,
}: {
  requests: AdminRequest[];
  partnersById: Map<number, AdminPartner>;
  invitesByRequest: Map<number, number>;
  monitorByRequest: Map<number, MonitorInvite[]>;
  optionsByRequest: Map<number, AdminQuoteOption[]>;
  invoicesByRequest: Map<number, AdminInvoiceRow>;
  statusFilter: string;
  partnerFilter: string;
  page: number;
}) {
  const now = Date.now();
  let rows = requests;
  if (statusFilter) {
    if (statusFilter === "rented" || statusFilter === "lost") {
      rows = rows.filter((r) => r.outcome === statusFilter);
    } else if (statusFilter === "silent") {
      rows = rows.filter((r) => isSilentRequest({ status: r.status, created_at: r.created_at }, monitorByRequest.get(r.id) ?? [], now));
    } else if (statusFilter === "awaiting") {
      rows = rows.filter((r) => isAwaitingChoice({ status: r.status }, monitorByRequest.get(r.id) ?? []));
    } else if (statusFilter === "auto_closed") {
      rows = rows.filter((r) => r.closure_reason === "client_silent" || r.closure_reason === "rental_started");
    } else if (statusFilter === "client_silent" || statusFilter === "rental_started" || statusFilter === "client_declined_all") {
      rows = rows.filter((r) => r.closure_reason === statusFilter);
    } else {
      rows = rows.filter((r) => r.status === statusFilter);
    }
  }
  if (partnerFilter) rows = rows.filter((r) => String(r.quoted_by_partner_id ?? "") === partnerFilter);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const qs = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (statusFilter) p.set("status", statusFilter);
    if (partnerFilter) p.set("partner", partnerFilter);
    for (const [k, v] of Object.entries(over)) {
      if (v === "") p.delete(k);
      else p.set(k, String(v));
    }
    const s = p.toString();
    return `/admin/car-rental${s ? `?${s}` : ""}`;
  };

  return (
    <section className="mt-5">
      {/* Filtres (liens, pas de JS). Partenaires : seulement ceux qui ont
          GAGNÉ au moins un devis : avec 59 loueurs en base, lister tout le
          registre ici était un mur de pastilles (audit UI 05/07). */}
      <div className="flex flex-wrap gap-1.5 text-sm">
        {["", "sent", "quoted", "silent", "awaiting", "accepted", "declined_by_client", "auto_closed", "client_silent", "rental_started", "cancelled", "email_failed", "rented", "lost"].map((f) => {
          const label = f === "" ? "tous"
            : f === "silent" ? "silencieux"
            : f === "awaiting" ? "attente choix"
            : f === "declined_by_client" ? "clôturées"
            : f === "auto_closed" ? "auto clôturées"
            : f === "client_silent" ? "client silencieux"
            : f === "rental_started" ? "date atteinte"
            : f === "cancelled" ? "hors flow"
            : f;
          return (
            <a key={f || "all"} href={qs({ status: f, page: "" })}
               className={`rounded-full border px-3 py-1 no-underline ${statusFilter === f ? "border-sea bg-sea text-white" : "border-border bg-white text-text"}`}>
              {label}
            </a>
          );
        })}
        {[...new Set(requests.map((r) => r.quoted_by_partner_id).filter((id): id is number => id != null))]
          .map((id) => partnersById.get(id))
          .filter((p): p is AdminPartner => p != null)
          .map((p) => (
          <a key={p.id} href={qs({ partner: partnerFilter === String(p.id) ? "" : p.id, page: "" })}
             className={`rounded-full border px-3 py-1 no-underline ${partnerFilter === String(p.id) ? "border-sea bg-sea text-white" : "border-border bg-white text-text"}`}>
            {p.name}
          </a>
        ))}
      </div>

      <ul className="mt-4 space-y-3">
        {pageRows.map((r) => {
          const winner = r.quoted_by_partner_id != null ? partnersById.get(r.quoted_by_partner_id) : undefined;
          const commission = requestCommission(r, partnersById);
          const relayPartner = winner ?? [...partnersById.values()].find((p) => p.active && p.lead_routing === "relay" && p.zone_ids.includes(r.zone_id));
          const invites = monitorByRequest.get(r.id) ?? [];
          const roll = partnerRelanceRollup(invites);
          const cRel = clientRelanceState(
            { status: r.status, client_relanced_at: r.client_relanced_at ?? null, client_relance_count: r.client_relance_count ?? 0 },
            now,
          );
          const inv = invoiceAdminState(invoicesByRequest.get(r.id));
          const expMs = offerExpiresAt(r.quoted_at, r.date_from);
          const startPassed = new Date(r.date_from + "T00:00:00").getTime() < now;
          return (
            <li key={r.id} className="rounded-2xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-data text-xs text-text-light">#{r.id} · {fmtDate(r.created_at)}</span>
                {statusBadge(r.status)}
                {closureReasonBadge(r.closure_reason)}
                {outcomeBadge(r.outcome)}
                {r.commission_paid_at ? (
                  <span className="rounded-full bg-ok px-2 py-0.5 text-xs font-bold text-white">commission encaissée</span>
                ) : r.commission_requested_at ? (
                  // Facture partie mais non réglée : sans cette mention, une
                  // commission due restait invisible tant qu'on ne lisait pas la base.
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs font-bold text-text-muted">
                    commission demandée le{" "}
                    {new Date(r.commission_requested_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Athens" })}
                  </span>
                ) : null}
                {bookingBadge(r)}
                {/* Numéro ET état de la facture : où en est l'argent, d'un coup
                    d'œil, sans ouvrir la base. */}
                {inv ? (
                  <span className={`rounded-full px-2 py-0.5 text-xs ${INVOICE_TONE[inv.tone]}`}>
                    <span className="font-data">{inv.number}</span> · {inv.label}
                  </span>
                ) : null}
                <span className="ml-auto text-xs text-text-muted">{invitesByRequest.get(r.id) ?? 0} loueur(s) invité(s)</span>
              </div>

              <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div>
                  <span className="font-bold">{carPickupLabel(r.pickup_slug)}</span>
                  {" · "}{r.date_from}{r.time_from ? ` ${r.time_from}` : ""}{r.flight_no ? ` (vol ${r.flight_no})` : ""} → {r.date_to}{r.time_to ? ` ${r.time_to}` : ""}
                  <br />
                  {carTypeLabel(r.car_type)}, {r.pax ?? "?"} pax
                  {r.insurance ? ` · assurance ${r.insurance}` : ""}{r.payment_method ? ` · ${r.payment_method}` : ""}
                  {r.note ? <div className="text-text-muted">Note client : {r.note}</div> : null}
                </div>
                <div>
                  {r.customer_name} · <a href={`mailto:${r.customer_email}`} className="text-sea">{r.customer_email}</a>
                  {r.customer_phone ? <> · {r.customer_phone}</> : null}
                  <br />
                  {r.status === "declined_by_client" ? (
                    <>Demande clôturée : <span className="font-bold">{closureReasonLabel(r.closure_reason) ?? "sans choix client"}</span></>
                  ) : r.status === "accepted" && winner ? (
                    <>Choisi par le client : <span className="font-bold">{winner.name}</span></>
                  ) : roll.quoted > 0 ? (
                    <><span className="font-bold">{roll.quoted} devis reçu{roll.quoted > 1 ? "s" : ""}</span> <span className="text-text-muted">· en attente du choix client</span></>
                  ) : winner ? (
                    <>Devis reçu de <span className="font-bold">{winner.name}</span> <span className="text-text-muted">· en attente du client</span></>
                  ) : <span className="text-text-muted">Pas encore de devis</span>}
                  {r.quoted_price != null ? <> · devis <span className="font-data font-bold">{r.quoted_price} €</span></> : null}
                  {r.final_amount_eur != null ? <> · final <span className="font-data font-bold">{r.final_amount_eur} €</span></> : null}
                  {commission != null ? <> · commission <span className="font-data font-bold">{commission.toFixed(2)} €</span></> : null}
                </div>
              </div>

              <InviteRoster invites={invites} requestStatus={r.status} now={now} startPassed={startPassed} />

              <OptionsDetail options={optionsByRequest.get(r.id) ?? []} request={r} />

              {/* Relances + expiry (une ligne compacte). */}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                <span>Loueurs : {roll.invited} invité(s) · {roll.quoted} chiffré(s) · {roll.silent} silencieux{roll.relanced > 0 ? ` · ${roll.relanced} relancé(s)` : ""}{roll.declined > 0 ? ` · ${roll.declined} décliné(s)` : ""}</span>
                <span>
                  Client :{" "}
                  {r.status === "declined_by_client" ? (closureReasonLabel(r.closure_reason) ?? "clôturé") :
                   roll.quoted > 0 ? `offre envoyée (lecture non suivie) · ${
                     cRel.kind === "eligible" ? "relance éligible" :
                     cRel.kind === "waiting" ? `prochaine relance dans ${hoursLabel(cRel.nextEligibleMs - now)}` :
                     cRel.kind === "exhausted" ? "relances épuisées (2/2)" : "aucune"
                   }` :
                   cRel.kind === "eligible" ? "relance éligible" :
                   cRel.kind === "waiting" ? `prochaine relance dans ${hoursLabel(cRel.nextEligibleMs - now)}` :
                   cRel.kind === "exhausted" ? "relances épuisées (2/2)" : "aucune"}
                  {" "}({r.client_relance_count ?? 0}/2)
                </span>
                {expMs != null && !startPassed ? (
                  <span className={now > expMs ? "font-bold text-terracotta" : ""}>
                    {now > expMs ? "offre expirée" : `expire dans ${hoursLabel(expMs - now)}`}
                  </span>
                ) : null}
                {startPassed ? <span className="text-text-light">location commencée</span> : null}
              </div>

              {/* Timeline repliée. */}
              {invites.length > 0 ? (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-text-muted underline">timeline</summary>
                  <ol className="mt-1 space-y-0.5 border-l border-border pl-3">
                    {buildTimeline(
                      { created_at: r.created_at, accepted_at: r.accepted_at, client_relanced_at: r.client_relanced_at ?? null, outcome: r.outcome, outcome_at: r.outcome_at, closure_reason: r.closure_reason ?? null },
                      invites,
                    ).map((e, i) => (
                      <li key={i}><span className="font-data text-text-light">{fmtDate(e.at)}</span> · {e.label}</li>
                    ))}
                  </ol>
                </details>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {r.outcome == null ? (
                  // Toute demande non classée est classable, y compris `sent`
                  // morte sans devis (client parti ailleurs → Perdu, ou loué
                  // hors flux → Loué avec montant saisi main).
                  <>
                    <form action={setOutcome.bind(null, r.id)} className="flex items-center gap-1.5">
                      <input type="hidden" name="outcome" value="rented" />
                      <input name="amount" inputMode="decimal" defaultValue={r.final_amount_eur ?? r.quoted_price ?? ""}
                             placeholder="€" className="w-20 rounded-lg border border-border px-2 py-1 text-sm" aria-label="Montant final (€)" />
                      <button className="rounded-full bg-olive px-3 py-1 text-sm font-bold text-white">Loué</button>
                    </form>
                    <form action={setOutcome.bind(null, r.id)}>
                      <input type="hidden" name="outcome" value="lost" />
                      <button className="rounded-full border border-border bg-white px-3 py-1 text-sm font-bold">Perdu</button>
                    </form>
                  </>
                ) : (
                  // Issue saisie : état compact, correction repliée pour
                  // éviter le clic accidentel (audit UI 05/07).
                  <details className="text-sm">
                    <summary className="cursor-pointer text-text-muted underline">corriger l&apos;issue</summary>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <form action={setOutcome.bind(null, r.id)} className="flex items-center gap-1.5">
                        <input type="hidden" name="outcome" value="rented" />
                        <input name="amount" inputMode="decimal" defaultValue={r.final_amount_eur ?? r.quoted_price ?? ""}
                               placeholder="€" className="w-20 rounded-lg border border-border px-2 py-1 text-sm" aria-label="Montant final (€)" />
                        <button className="rounded-full bg-olive px-3 py-1 text-sm font-bold text-white">Loué</button>
                      </form>
                      <form action={setOutcome.bind(null, r.id)}>
                        <input type="hidden" name="outcome" value="lost" />
                        <button className="rounded-full border border-border bg-white px-3 py-1 text-sm font-bold">Perdu</button>
                      </form>
                    </div>
                  </details>
                )}
                {r.outcome === "rented" ? (
                  <form action={setCommissionPaid.bind(null, r.id, !r.commission_paid_at)}>
                    <button className={`rounded-full px-3 py-1 text-sm font-bold ${r.commission_paid_at ? "border border-border bg-white" : "bg-sun text-night"}`}>
                      {r.commission_paid_at ? "Repasser en due" : "Commission encaissée"}
                    </button>
                  </form>
                ) : null}
                {/* Renvoi de facture. Un envoi Resend refusé laisse la facture
                    numérotée avec sent_at NULL, et le cron ne la reprendra
                    jamais : il filtre sur outcome IS NULL alors que la bascule
                    en « rented » a déjà eu lieu. Ce bouton est le SEUL
                    rattrapage. Un loueur sans email le verrait refuser, on ne
                    l'affiche donc pas et on dit pourquoi. */}
                {inv?.canResend ? (
                  winner?.email ? (
                    <form action={resendInvoiceAction.bind(null, r.id)}>
                      <button className={`rounded-full px-3 py-1 text-sm font-bold ${inv.tone === "alert" ? "bg-terracotta text-white" : "border border-border bg-white"}`}>
                        {inv.tone === "alert" ? "Renvoyer la facture" : "Renvoyer"}
                      </button>
                    </form>
                  ) : (
                    <span className="text-sm text-terracotta">
                      Facture non renvoyable : loueur sans email
                    </span>
                  )
                ) : null}
                {/* Avoir : la facture ne se supprime pas, elle s'annule, et la
                    demande repasse en « perdue ». Repliée pour éviter le clic
                    accidentel, motif obligatoire (l'action le refuse sinon). */}
                {inv?.canCredit ? (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-text-muted underline">émettre un avoir</summary>
                    <form action={creditInvoiceAction.bind(null, r.id)} className="mt-2 flex flex-wrap items-center gap-1.5">
                      <input name="reason" required maxLength={300} placeholder="Motif de l'avoir…"
                             className="w-56 rounded-lg border border-border px-2 py-1 text-sm" aria-label="Motif de l'avoir" />
                      <button className="rounded-full border border-terracotta bg-white px-3 py-1 text-sm font-bold text-terracotta">
                        Annuler {inv.number} par un avoir
                      </button>
                    </form>
                  </details>
                ) : null}
                {relayWaLink(r, relayPartner)}
                <form action={saveNote.bind(null, r.id)} className="flex min-w-56 flex-1 items-center gap-1.5">
                  <input name="note" defaultValue={r.admin_note ?? ""} placeholder="Note admin…"
                         className="w-full flex-1 rounded-lg border border-border px-2 py-1 text-sm" />
                  <button className="rounded-full border border-border bg-white px-3 py-1 text-sm font-bold">OK</button>
                </form>
                {/* Sortie du flow : demande erronée/spam. Repliée pour éviter le
                    clic accidentel (arrête relances loueur + client, coupe le
                    lien client, refuse tout devis tardif). */}
                {canCancelRequest(r.status) ? (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-text-muted underline">sortir du flow</summary>
                    <div className="mt-2">
                      <form action={cancelRequest.bind(null, r.id)}>
                        <button className="rounded-full border border-terracotta bg-white px-3 py-1 text-sm font-bold text-terracotta">
                          Confirmer la sortie du flow
                        </button>
                      </form>
                    </div>
                  </details>
                ) : null}
              </div>
            </li>
          );
        })}
        {pageRows.length === 0 ? <li className="rounded-2xl border border-border bg-white p-6 text-center text-sm text-text-muted">Aucune demande.</li> : null}
      </ul>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {safePage > 1 ? <a href={qs({ page: safePage - 1 })} className="font-bold text-sea">← Précédent</a> : null}
          <span className="text-text-muted">page {safePage} / {totalPages}</span>
          {safePage < totalPages ? <a href={qs({ page: safePage + 1 })} className="font-bold text-sea">Suivant →</a> : null}
        </div>
      ) : null}
    </section>
  );
}
