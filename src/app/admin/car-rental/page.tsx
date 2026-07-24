// Back-office Car Rental Direct. Server component : auth (query/cookie),
// 3 lectures service_role, jointures en mémoire, deux vues par onglet.
// Spec : docs/superpowers/specs/2026-07-04-car-rental-admin-design.md
import { notFound, redirect } from "next/navigation";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { isCarAdmin } from "@/lib/car-admin-auth";
import {
  requestsSummary, type AdminPartner, type AdminRequest,
} from "@/lib/car-admin";
import { kpis, reconcileWinnerSnapshot } from "@/lib/car-monitoring";
import type { MonitorInvite } from "@/lib/car-monitoring";
import { RequestsTable, type AdminQuoteOption } from "./requests-table";
import { PartnersTable } from "./partners-table";
import { KpiBand } from "./kpi-band";

export const dynamic = "force-dynamic";

export default async function CarAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; tab?: string; status?: string; partner?: string; page?: string; error?: string; pactive?: string; poutreach?: string; q?: string }>;
}) {
  const sp = await searchParams;
  // Un param répété (?key=a&key=b) arrive en array au runtime malgré le type TS.
  const key = typeof sp.key === "string" ? sp.key : undefined;

  // ?key= valide → on passe par la route auth/ qui pose le cookie et
  // redirige (contrat : ne JAMAIS rendre avec la clé dans l'URL).
  // Sinon cookie obligatoire, sinon 404.
  if (key) {
    if (await isCarAdmin(key)) redirect(`/admin/car-rental/auth?key=${encodeURIComponent(key)}`);
    notFound();
  }
  if (!(await isCarAdmin())) notFound();

  // Cap 1000 demandes : à ce volume (quelques/semaine) c'est des années ; si un jour dépassé, les totaux du bandeau seraient tronqués.
  // try/catch : un client injoignable (ex. clé service absente en dev local)
  // doit finir en bandeau d'erreur, pas en 500 (spec §4).
  let requests: AdminRequest[] = [];
  let partners: AdminPartner[] = [];
  let invites: { request_id: number; partner_id: number }[] = [];
  let invitesFull: {
    id: number; request_id: number; partner_id: number; status: string;
    quote_price: number | null; quote_currency: string | null; quote_car_model: string | null;
    created_at: string; quoted_at: string | null; declined_at: string | null; relanced_at: string | null; closed_notified_at: string | null;
    car_partners?: { name?: string };
  }[] = [];
  let options: (AdminQuoteOption & { car_partners?: { name?: string } })[] = [];
  let loadError: string | null = null;
  try {
    const [reqRes, partRes, invRes, invFullRes, optRes] = await Promise.all([
      supabase.from("car_requests").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("car_partners").select("*").order("id"),
      supabase.from("car_quote_invites").select("request_id, partner_id"),
      supabase.from("car_quote_invites").select(
        "id, request_id, partner_id, status, quote_price, quote_currency, quote_car_model, created_at, quoted_at, declined_at, relanced_at, closed_notified_at, car_partners(name)"
      ),
      supabase.from("car_quote_options").select(
        "id, request_id, invite_id, partner_id, price, currency, car_model, gearbox, inclusions, insurance_type, excess_eur, zero_excess_upsell_eur_day, created_at, car_partners(name)"
      ).order("price"),
    ]);
    loadError = reqRes.error?.message ?? partRes.error?.message ?? invRes.error?.message ?? invFullRes.error?.message ?? optRes.error?.message ?? null;
    requests = (reqRes.data ?? []) as AdminRequest[];
    partners = (partRes.data ?? []) as AdminPartner[];
    invites = (invRes.data ?? []) as { request_id: number; partner_id: number }[];
    invitesFull = (invFullRes.data ?? []) as typeof invitesFull;
    options = (optRes.data ?? []) as typeof options;
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  const partnersById = new Map(partners.map((p) => [p.id, p]));
  const invitesByRequest = new Map<number, number>();
  const invitesByPartner = new Map<number, number>();
  for (const i of invites) {
    invitesByRequest.set(i.request_id, (invitesByRequest.get(i.request_id) ?? 0) + 1);
    invitesByPartner.set(i.partner_id, (invitesByPartner.get(i.partner_id) ?? 0) + 1);
  }

  const monitorByRequest = new Map<number, MonitorInvite[]>();
  for (const r of invitesFull) {
    const list = monitorByRequest.get(r.request_id) ?? [];
    list.push({
      id: r.id, request_id: r.request_id, partner_id: r.partner_id,
      partner_name: r.car_partners?.name ?? "Agency",
      status: r.status, quote_price: r.quote_price, quote_currency: r.quote_currency,
      quote_car_model: r.quote_car_model, created_at: r.created_at,
      quoted_at: r.quoted_at, declined_at: r.declined_at, relanced_at: r.relanced_at, closed_notified_at: r.closed_notified_at,
    });
    monitorByRequest.set(r.request_id, list);
  }

  const optionsByRequest = new Map<number, AdminQuoteOption[]>();
  for (const o of options) {
    const list = optionsByRequest.get(o.request_id) ?? [];
    list.push({ ...o, partner_name: o.car_partners?.name ?? "Agency" });
    optionsByRequest.set(o.request_id, list);
  }

  // Réconcilie le snapshot gagnant first-come (car_requests.quoted_*) sur l'invite du loueur :
  // sinon les vieilles demandes affichent le gagnant comme « silencieux » et 0 devis en KPI.
  const requestsById = new Map(requests.map((r) => [r.id, r]));
  for (const [rid, list] of monitorByRequest) {
    const req = requestsById.get(rid);
    if (req) monitorByRequest.set(rid, reconcileWinnerSnapshot(list, req));
  }

  // Task 13 Step 1 : monitorByPartner construit UNE fois à partir de monitorByRequest (pas de N+1).
  const monitorByPartner = new Map<number, MonitorInvite[]>();
  for (const list of monitorByRequest.values()) {
    for (const mi of list) {
      const arr = monitorByPartner.get(mi.partner_id) ?? [];
      arr.push(mi);
      monitorByPartner.set(mi.partner_id, arr);
    }
  }

  // Task 12 Step 2 : calcul des KPI sur fenêtres 7j / 30j.
  const nowMs = Date.now();
  const windowReqs = (days: number) => {
    const from = nowMs - days * 86400000;
    return requests.filter((r) => new Date(r.created_at).getTime() >= from);
  };
  const kpiReq = (r: AdminRequest) => ({
    id: r.id, status: r.status, created_at: r.created_at, accepted_at: r.accepted_at,
    client_relanced_at: r.client_relanced_at ?? null, client_relance_count: r.client_relance_count ?? 0,
  });
  const k7 = kpis(windowReqs(7).map(kpiReq), monitorByRequest, nowMs);
  const k30 = kpis(windowReqs(30).map(kpiReq), monitorByRequest, nowMs);

  const s = requestsSummary(requests, partnersById);
  const tab = sp.tab === "partners" ? "partners" : "requests";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-heading text-2xl font-extrabold">Car Rental Direct · admin</h1>

      {loadError ? (
        <p className="mt-4 rounded-xl border border-terracotta bg-terracotta-faint p-4 text-sm">
          Erreur de lecture : {loadError} (migration 20260705 appliquée ? DB joignable ?)
        </p>
      ) : null}

      {typeof sp.error === "string" && sp.error ? (
        <p className="mt-4 rounded-xl border border-terracotta bg-terracotta-faint p-4 text-sm">
          {sp.error}
        </p>
      ) : null}

      {/* Bandeau : les 2 chiffres qui comptent en vedette, le reste en
          compteurs-liens compacts (audit UI 05/07). */}
      <section className="mt-5 flex flex-wrap items-stretch gap-3">
        <div className="rounded-xl border border-sun bg-white px-5 py-3">
          <div className="text-xs text-text-muted">commission due</div>
          <div className="font-data text-2xl font-bold">{s.commissionDueEur.toFixed(2)} €</div>
        </div>
        <div className="rounded-xl border border-ok bg-white px-5 py-3">
          <div className="text-xs text-text-muted">commission encaissée</div>
          <div className="font-data text-2xl font-bold">{s.commissionPaidEur.toFixed(2)} €</div>
        </div>
        <div className="flex flex-wrap content-center items-center gap-1.5 text-sm">
          {([["sent", s.byStatus.sent ?? 0], ["quoted", s.byStatus.quoted ?? 0], ["accepted", s.byStatus.accepted ?? 0],
             ["declined_by_client", s.byStatus.declined_by_client ?? 0], ["email_failed", s.byStatus.email_failed ?? 0], ["rented", s.rented], ["lost", s.lost]] as const).map(([st, n]) => (
            <a key={st} href={`/admin/car-rental?status=${st}`}
               className={`rounded-full border px-2.5 py-0.5 no-underline ${st === "email_failed" && n > 0 ? "border-terracotta bg-terracotta-faint font-bold" : "border-border bg-white text-text-muted"}`}>
              {st} <span className="font-data font-bold text-text">{n}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Bandeau KPI 7j/30j (onglet requests uniquement) */}
      {tab === "requests" ? <KpiBand k7={k7} k30={k30} /> : null}

      {/* Onglets */}
      <nav className="mt-6 flex gap-2">
        <a href="/admin/car-rental" className={`rounded-full px-4 py-1.5 text-sm font-bold no-underline ${tab === "requests" ? "bg-sea text-white" : "border border-border bg-white text-text"}`}>
          Demandes ({requests.length})
        </a>
        <a href="/admin/car-rental?tab=partners" className={`rounded-full px-4 py-1.5 text-sm font-bold no-underline ${tab === "partners" ? "bg-sea text-white" : "border border-border bg-white text-text"}`}>
          Partenaires ({partners.length})
        </a>
      </nav>

      {tab === "requests" ? (
        <RequestsTable
          requests={requests}
          partnersById={partnersById}
          invitesByRequest={invitesByRequest}
          monitorByRequest={monitorByRequest}
          optionsByRequest={optionsByRequest}
          statusFilter={sp.status ?? ""}
          partnerFilter={sp.partner ?? ""}
          page={Math.max(1, Number(sp.page) || 1)}
        />
      ) : (
        <PartnersTable
          partners={partners}
          requests={requests}
          invitesByPartner={invitesByPartner}
          partnersById={partnersById}
          monitorByPartner={monitorByPartner}
          activeFilter={typeof sp.pactive === "string" ? sp.pactive : ""}
          outreachFilter={typeof sp.poutreach === "string" ? sp.poutreach : ""}
          query={typeof sp.q === "string" ? sp.q : ""}
        />
      )}
    </main>
  );
}
