// Cockpit interne Stays. Server component, lecture seule, zero JS client.
// Auth : meme secret et meme cookie que /admin/car-rental (isCarAdmin).
// Plan : docs/superpowers/plans/2026-07-28-stays-lot-b-autonomie-campagne.md, Task 11.
//
// Les mesures vivent dans src/lib/stays/admin-metrics.ts, testees : cette page ne
// fait que lire la base et afficher. Un denominateur nul s'affiche "n/d", jamais
// un chiffre inventé.
import { notFound, redirect } from "next/navigation";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { isCarAdmin } from "@/lib/car-admin-auth";
import {
  staysKpis,
  listingSignal,
  ownerIsBlocking,
  type AdminStayRequest,
  type AdminStayListing,
  type AdminStayOwner,
  type ListingSignal,
  type StaysKpis,
} from "@/lib/stays/admin-metrics";

export const dynamic = "force-dynamic";

const eur = (n: number | null | undefined): string =>
  n == null ? "n/d" : `${Number(n).toFixed(2)} €`;
const pct = (r: number | null): string => (r == null ? "n/d" : `${Math.round(r * 100)} %`);
const day = (iso: string | null): string => (iso ? iso.slice(0, 10) : "n/d");

const SIGNAL_LABEL: Record<ListingSignal, string> = {
  ok: "ical frais",
  no_ical: "aucun ical",
  stale_ical: "synchro > 24 h",
  ical_error: "flux en erreur",
  unpublished: "hors ligne",
};

/** Seul un signal de surbooking merite du rouge : le reste est informatif. */
const SIGNAL_CLASS: Record<ListingSignal, string> = {
  ok: "border-ok bg-white text-text-muted",
  no_ical: "border-terracotta bg-terracotta-faint font-bold",
  stale_ical: "border-terracotta bg-terracotta-faint font-bold",
  ical_error: "border-terracotta bg-terracotta-faint font-bold",
  unpublished: "border-border bg-white text-text-muted",
};

const TH = "px-2 py-1.5 text-left text-[11px] uppercase tracking-wide text-text-muted";
const TD = "px-2 py-1.5 align-top";
const ROW = "border-t border-border";

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] ${className}`}>
      {label}
    </span>
  );
}

function Cell({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2">
      <div className="text-[11px] text-text-muted">{label}</div>
      <div className="font-data text-sm font-bold">{v}</div>
    </div>
  );
}

function KpiWindow({ title, k }: { title: string; k: StaysKpis }) {
  return (
    <div className="flex-1">
      <div className="mb-1 text-xs font-bold text-text-muted">{title}</div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <Cell label="demandes" v={String(k.requests)} />
        <Cell label="taux d acceptation" v={pct(k.acceptRate)} />
        <Cell label="acompte paye" v={pct(k.depositRate)} />
      </div>
    </div>
  );
}

export default async function StaysAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const key = typeof sp.key === "string" ? sp.key : undefined;

  // Contrat du back-office : on ne rend JAMAIS une page avec la cle dans l'URL.
  // Une cle valide passe par auth/, qui pose le cookie et redirige.
  if (key) {
    if (await isCarAdmin(key)) redirect(`/admin/stays/auth?key=${encodeURIComponent(key)}`);
    notFound();
  }
  if (!(await isCarAdmin())) notFound();

  let listings: AdminStayListing[] = [];
  let requests: AdminStayRequest[] = [];
  let owners: AdminStayOwner[] = [];
  let loadError: string | null = null;

  // Une base injoignable doit finir en bandeau d'erreur, pas en 500 : le cockpit
  // sert justement a diagnostiquer quand quelque chose ne repond pas.
  try {
    const [listRes, reqRes, ownRes] = await Promise.all([
      supabase
        .from("stay_listings")
        .select(
          "id, slug, owner_id, title, status, base_price_eur, min_nights, photos, ical_private_url, ical_synced_at, ical_last_error",
        )
        .order("id"),
      supabase
        .from("stay_requests")
        .select(
          "id, listing_id, guest_name, guest_email, date_from, date_to, status, locale, created_at, quoted_price_eur, deposit_amount, deposit_paid_at, balance_amount, balance_paid_at, balance_requested_at, commission_eur",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("stay_owners")
        .select(
          "id, email, name, kyc_status, stripe_connect_account_id, locale, owner_token_hash",
        )
        .order("id"),
    ]);
    loadError = listRes.error?.message ?? reqRes.error?.message ?? ownRes.error?.message ?? null;
    listings = (listRes.data ?? []) as AdminStayListing[];
    requests = (reqRes.data ?? []) as AdminStayRequest[];
    owners = (ownRes.data ?? []) as AdminStayOwner[];
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  // Les demandes portent aussi les colonnes voyageur, absentes du type de mesure.
  type RequestRow = AdminStayRequest & {
    guest_name: string;
    guest_email: string;
    date_from: string;
    date_to: string;
    locale: string | null;
    balance_requested_at: string | null;
  };
  const rows = requests as RequestRow[];

  const nowMs = Date.now();
  const k7 = staysKpis(requests, 7, nowMs);
  const k30 = staysKpis(requests, 30, nowMs);

  const listingById = new Map(listings.map((l) => [l.id, l]));
  const ownerById = new Map(owners.map((o) => [o.id, o]));
  const listingsByOwner = new Map<number, AdminStayListing[]>();
  for (const l of listings) {
    const arr = listingsByOwner.get(l.owner_id) ?? [];
    arr.push(l);
    listingsByOwner.set(l.owner_id, arr);
  }

  const statusFilter = typeof sp.status === "string" ? sp.status : "";
  const filtered = statusFilter ? rows.filter((r) => r.status === statusFilter) : rows;

  const byStatus = new Map<string, number>();
  for (const r of rows) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);

  const alerts = listings.filter((l) => {
    const s = listingSignal(l, nowMs);
    return s !== "ok" && s !== "unpublished";
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-heading text-2xl font-extrabold">crete.direct Stays · admin</h1>
      <p className="mt-1 text-sm text-text-muted">
        Lecture seule. Les liens d espace proprietaire ne sont pas relisibles : seul leur
        hachage est en base.
      </p>

      {loadError ? (
        <p className="mt-4 rounded-xl border border-terracotta bg-terracotta-faint p-4 text-sm">
          Erreur de lecture : {loadError}
        </p>
      ) : null}

      <section className="mt-5 flex flex-wrap items-stretch gap-3">
        <div className="rounded-xl border border-ok bg-white px-5 py-3">
          <div className="text-xs text-text-muted">commission encaissee</div>
          <div className="font-data text-2xl font-bold">{eur(k7.commissionCollectedEur)}</div>
          <div className="text-[11px] text-text-muted">tout l historique</div>
        </div>
        <div className="rounded-xl border border-sun bg-white px-5 py-3">
          <div className="text-xs text-text-muted">annonces publiees</div>
          <div className="font-data text-2xl font-bold">
            {listings.filter((l) => l.status === "published").length}
          </div>
          <div className="text-[11px] text-text-muted">{listings.length} au total</div>
        </div>
        <div
          className={`rounded-xl border px-5 py-3 ${
            alerts.length ? "border-terracotta bg-terracotta-faint" : "border-border bg-white"
          }`}
        >
          <div className="text-xs text-text-muted">risque de surbooking</div>
          <div className="font-data text-2xl font-bold">{alerts.length}</div>
          <div className="text-[11px] text-text-muted">annonces publiees sans ical a jour</div>
        </div>
      </section>

      <section className="mt-5 flex flex-col gap-4 rounded-xl border border-border bg-sand/30 p-4 sm:flex-row">
        <KpiWindow title="7 jours" k={k7} />
        <KpiWindow title="30 jours" k={k30} />
      </section>

      {/* Annonces */}
      <h2 className="mt-8 font-heading text-lg font-bold">Annonces ({listings.length})</h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={TH}>slug</th>
              <th className={TH}>proprietaire</th>
              <th className={TH}>statut</th>
              <th className={TH}>prix / nuit</th>
              <th className={TH}>min nuits</th>
              <th className={TH}>photos</th>
              <th className={TH}>ical</th>
              <th className={TH}>derniere synchro</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => {
              const signal = listingSignal(l, nowMs);
              const owner = ownerById.get(l.owner_id);
              return (
                <tr key={l.id} className={ROW}>
                  <td className={TD}>
                    <span className="font-data">{l.slug}</span>
                    {l.ical_last_error ? (
                      <div className="text-[11px] text-terracotta">{l.ical_last_error}</div>
                    ) : null}
                  </td>
                  <td className={TD}>{owner?.email ?? `#${l.owner_id}`}</td>
                  <td className={TD}>{l.status}</td>
                  <td className={`${TD} font-data`}>{eur(l.base_price_eur)}</td>
                  <td className={`${TD} font-data`}>{l.min_nights ?? "n/d"}</td>
                  <td className={`${TD} font-data`}>{(l.photos ?? []).length}</td>
                  <td className={TD}>
                    <Badge label={SIGNAL_LABEL[signal]} className={SIGNAL_CLASS[signal]} />
                  </td>
                  <td className={`${TD} font-data`}>{day(l.ical_synced_at)}</td>
                </tr>
              );
            })}
            {listings.length === 0 ? (
              <tr className={ROW}>
                <td className={TD} colSpan={8}>
                  Aucune annonce.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Demandes */}
      <h2 className="mt-8 font-heading text-lg font-bold">Demandes ({rows.length})</h2>
      <nav className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
        <a
          href="/admin/stays"
          className={`rounded-full border px-2.5 py-0.5 no-underline ${
            statusFilter ? "border-border bg-white text-text-muted" : "border-sea bg-sea text-white"
          }`}
        >
          toutes <span className="font-data font-bold">{rows.length}</span>
        </a>
        {[...byStatus.entries()].map(([st, n]) => (
          <a
            key={st}
            href={`/admin/stays?status=${st}`}
            className={`rounded-full border px-2.5 py-0.5 no-underline ${
              statusFilter === st
                ? "border-sea bg-sea text-white"
                : "border-border bg-white text-text-muted"
            }`}
          >
            {st} <span className="font-data font-bold">{n}</span>
          </a>
        ))}
      </nav>
      <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={TH}>annonce</th>
              <th className={TH}>voyageur</th>
              <th className={TH}>dates</th>
              <th className={TH}>statut</th>
              <th className={TH}>prix accepte</th>
              <th className={TH}>acompte</th>
              <th className={TH}>solde</th>
              <th className={TH}>langue</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className={ROW}>
                <td className={TD}>
                  <span className="font-data">
                    {listingById.get(r.listing_id)?.slug ?? `#${r.listing_id}`}
                  </span>
                  <div className="text-[11px] text-text-muted">{day(r.created_at)}</div>
                </td>
                <td className={TD}>
                  {r.guest_name}
                  <div className="text-[11px] text-text-muted">{r.guest_email}</div>
                </td>
                <td className={`${TD} font-data`}>
                  {r.date_from} au {r.date_to}
                </td>
                <td className={TD}>{r.status}</td>
                <td className={`${TD} font-data`}>{eur(r.quoted_price_eur)}</td>
                <td className={`${TD} font-data`}>
                  {eur(r.deposit_amount)}
                  <div className="text-[11px] text-text-muted">
                    {r.deposit_paid_at ? `paye le ${day(r.deposit_paid_at)}` : "non paye"}
                  </div>
                </td>
                <td className={`${TD} font-data`}>
                  {eur(r.balance_amount)}
                  <div className="text-[11px] text-text-muted">
                    {r.balance_paid_at
                      ? `paye le ${day(r.balance_paid_at)}`
                      : r.balance_requested_at
                        ? `demande le ${day(r.balance_requested_at)}`
                        : "non demande"}
                  </div>
                </td>
                <td className={`${TD} font-data`}>{r.locale ?? "n/d"}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr className={ROW}>
                <td className={TD} colSpan={8}>
                  Aucune demande{statusFilter ? ` au statut ${statusFilter}` : ""}.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Proprietaires */}
      <h2 className="mt-8 font-heading text-lg font-bold">Proprietaires ({owners.length})</h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={TH}>email</th>
              <th className={TH}>kyc</th>
              <th className={TH}>compte connect</th>
              <th className={TH}>annonces</th>
              <th className={TH}>espace</th>
              <th className={TH}>langue</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((o) => {
              const own = listingsByOwner.get(o.id) ?? [];
              const blocking = ownerIsBlocking(o.kyc_status, own);
              return (
                <tr key={o.id} className={ROW}>
                  <td className={TD}>
                    {o.email}
                    {o.name ? (
                      <div className="text-[11px] text-text-muted">{o.name}</div>
                    ) : null}
                  </td>
                  <td className={TD}>
                    <Badge
                      label={o.kyc_status ?? "none"}
                      className={
                        blocking
                          ? "border-terracotta bg-terracotta-faint font-bold"
                          : "border-border bg-white text-text-muted"
                      }
                    />
                    {blocking ? (
                      <div className="text-[11px] text-terracotta">
                        annonce publiee non encaissable
                      </div>
                    ) : null}
                  </td>
                  <td className={`${TD} font-data text-[11px]`}>
                    {o.stripe_connect_account_id ?? "aucun"}
                  </td>
                  <td className={`${TD} font-data`}>
                    {own.length}
                    <div className="text-[11px] text-text-muted">
                      {own.filter((l) => l.status === "published").length} en ligne
                    </div>
                  </td>
                  <td className={TD}>{o.owner_token_hash ? "lien pose" : "aucun lien"}</td>
                  <td className={`${TD} font-data`}>{o.locale ?? "n/d"}</td>
                </tr>
              );
            })}
            {owners.length === 0 ? (
              <tr className={ROW}>
                <td className={TD} colSpan={6}>
                  Aucun proprietaire.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
