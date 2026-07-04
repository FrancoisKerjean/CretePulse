// Back-office Car Rental Direct. Server component : auth (query/cookie),
// 3 lectures service_role, jointures en mémoire, deux vues par onglet.
// Spec : docs/superpowers/specs/2026-07-04-car-rental-admin-design.md
import { notFound, redirect } from "next/navigation";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { isCarAdmin } from "@/lib/car-admin-auth";
import {
  requestsSummary, type AdminPartner, type AdminRequest,
} from "@/lib/car-admin";
import { RequestsTable } from "./requests-table";
import { PartnersTable } from "./partners-table";

export const dynamic = "force-dynamic";

export default async function CarAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; tab?: string; status?: string; partner?: string; page?: string }>;
}) {
  const sp = await searchParams;

  // ?key= valide → on passe par la route auth/ qui pose le cookie et
  // redirige (contrat : ne JAMAIS rendre avec la clé dans l'URL).
  // Sinon cookie obligatoire, sinon 404.
  if (sp.key) {
    if (await isCarAdmin(sp.key)) redirect(`/admin/car-rental/auth?key=${encodeURIComponent(sp.key)}`);
    notFound();
  }
  if (!(await isCarAdmin())) notFound();

  const [reqRes, partRes, invRes] = await Promise.all([
    supabase.from("car_requests").select("*").order("created_at", { ascending: false }).limit(1000),
    supabase.from("car_partners").select("*").order("id"),
    supabase.from("car_quote_invites").select("request_id, partner_id"),
  ]);
  const loadError = reqRes.error?.message ?? partRes.error?.message ?? invRes.error?.message ?? null;
  const requests = (reqRes.data ?? []) as AdminRequest[];
  const partners = (partRes.data ?? []) as AdminPartner[];
  const invites = (invRes.data ?? []) as { request_id: number; partner_id: number }[];

  const partnersById = new Map(partners.map((p) => [p.id, p]));
  const invitesByRequest = new Map<number, number>();
  const invitesByPartner = new Map<number, number>();
  for (const i of invites) {
    invitesByRequest.set(i.request_id, (invitesByRequest.get(i.request_id) ?? 0) + 1);
    invitesByPartner.set(i.partner_id, (invitesByPartner.get(i.partner_id) ?? 0) + 1);
  }

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

      {/* Bandeau de synthèse */}
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {(["sent", "quoted", "accepted", "email_failed"] as const).map((st) => (
          <div key={st} className={`rounded-xl border bg-white p-3 ${st === "email_failed" && (s.byStatus[st] ?? 0) > 0 ? "border-terracotta" : "border-border"}`}>
            <div className="text-xs text-text-muted">{st}</div>
            <div className="font-data text-xl font-bold">{s.byStatus[st] ?? 0}</div>
          </div>
        ))}
        <div className="rounded-xl border border-border bg-white p-3">
          <div className="text-xs text-text-muted">rented / lost</div>
          <div className="font-data text-xl font-bold">{s.rented} / {s.lost}</div>
        </div>
        <div className="rounded-xl border border-sun bg-white p-3">
          <div className="text-xs text-text-muted">commission due</div>
          <div className="font-data text-xl font-bold">{s.commissionDueEur.toFixed(2)} €</div>
        </div>
        <div className="rounded-xl border border-ok bg-white p-3">
          <div className="text-xs text-text-muted">commission encaissée</div>
          <div className="font-data text-xl font-bold">{s.commissionPaidEur.toFixed(2)} €</div>
        </div>
      </section>

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
          statusFilter={sp.status ?? ""}
          partnerFilter={sp.partner ?? ""}
          page={Math.max(1, Number(sp.page) || 1)}
        />
      ) : (
        <PartnersTable partners={partners} requests={requests} invitesByPartner={invitesByPartner} partnersById={partnersById} />
      )}
    </main>
  );
}
