// Vue Prestataires : registre activity_partners + stats calculées.
// Tri actifs/gagnants d'abord, filtres actif/inactif + statut recrutement, recherche (form GET).
// Écritures : toggle active + catégorie/villes/commission (forms natifs → server actions).
// Zéro use client.
import { partnerStats, CATEGORY_SLUGS, CITY_SLUGS, categoryLabel, cityLabel, type AdminPartner, type AdminRequest } from "@/lib/activity-admin";
import { partnerPerf, type MonitorInvite } from "@/lib/activity-monitoring";
import { togglePartnerActive, updatePartner } from "./actions";

const BASE = "/admin/activities";

function outreachBadge(status?: string | null) {
  if (!status) return null;
  const declined = status === "declined";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${declined ? "bg-terracotta text-white" : "bg-sky text-night"}`}>
      {status}
    </span>
  );
}

export function PartnersTable({
  partners, requests, invitesByPartner, partnersById, monitorByPartner, activeFilter, outreachFilter, query,
}: {
  partners: AdminPartner[];
  requests: AdminRequest[];
  invitesByPartner: Map<number, number>;
  partnersById: Map<number, AdminPartner>;
  monitorByPartner: Map<number, MonitorInvite[]>;
  activeFilter: string;   // "" | "actifs" | "inactifs"
  outreachFilter: string; // "" | un outreach_status présent en base
  query: string;
}) {
  const statsById = new Map(partners.map((p) => [p.id, partnerStats(p.id, requests, invitesByPartner, partnersById)]));

  // Tri : actifs d'abord, puis devis gagnés décroissant, puis nom.
  const sorted = [...partners].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    const wa = statsById.get(a.id)?.won ?? 0;
    const wb = statsById.get(b.id)?.won ?? 0;
    if (wa !== wb) return wb - wa;
    return a.name.localeCompare(b.name);
  });

  const q = query.trim().toLowerCase();
  let rows = sorted;
  if (activeFilter === "actifs") rows = rows.filter((p) => p.active);
  if (activeFilter === "inactifs") rows = rows.filter((p) => !p.active);
  if (outreachFilter) rows = rows.filter((p) => (p.outreach_status ?? "") === outreachFilter);
  if (q) rows = rows.filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));

  const outreachStatuses = [...new Set(partners.map((p) => p.outreach_status).filter((s): s is string => !!s))].sort();

  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams({ tab: "partners" });
    if (activeFilter) p.set("pactive", activeFilter);
    if (outreachFilter) p.set("poutreach", outreachFilter);
    if (query) p.set("q", query);
    for (const [k, v] of Object.entries(over)) {
      if (v === "") p.delete(k);
      else p.set(k, v);
    }
    return `${BASE}?${p.toString()}`;
  };

  return (
    <section className="mt-5">
      {/* Filtres + recherche (liens et form GET, zéro JS) */}
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        {[["", "tous"], ["actifs", "actifs"], ["inactifs", "inactifs"]].map(([v, label]) => (
          <a key={label} href={qs({ pactive: v })}
             className={`rounded-full border px-3 py-1 no-underline ${activeFilter === v ? "border-sea bg-sea text-white" : "border-border bg-white text-text"}`}>
            {label}
          </a>
        ))}
        {outreachStatuses.map((st) => (
          <a key={st} href={qs({ poutreach: outreachFilter === st ? "" : st })}
             className={`rounded-full border px-3 py-1 no-underline ${outreachFilter === st ? "border-sea bg-sea text-white" : "border-border bg-white text-text"}`}>
            {st}
          </a>
        ))}
        <form action={BASE} method="get" className="ml-auto flex items-center gap-1.5">
          <input type="hidden" name="tab" value="partners" />
          {activeFilter ? <input type="hidden" name="pactive" value={activeFilter} /> : null}
          {outreachFilter ? <input type="hidden" name="poutreach" value={outreachFilter} /> : null}
          <input name="q" defaultValue={query} placeholder="Chercher nom ou email…"
                 className="w-48 rounded-lg border border-border bg-white px-2 py-1" aria-label="Recherche prestataire" />
          <button className="rounded-full border border-border bg-white px-3 py-1 font-bold">OK</button>
        </form>
      </div>

      <p className="mt-2 text-xs text-text-muted">{rows.length} prestataire(s) affiché(s) sur {partners.length}.</p>

      <div className="mt-3 space-y-2">
        {rows.map((p) => {
          const st = statsById.get(p.id)!;
          const perf = partnerPerf(p.id, monitorByPartner);
          const declined = p.outreach_status === "declined";
          return (
            <details key={p.id} className={`rounded-2xl border bg-white ${declined ? "border-terracotta" : "border-border"}`}>
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3 text-sm">
                <span className="font-heading font-bold">{p.name}</span>
                {p.active
                  ? <span className="rounded-full bg-ok px-2 py-0.5 text-xs font-bold text-white">actif</span>
                  : <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">inactif</span>}
                {outreachBadge(p.outreach_status)}
                <span className="text-xs text-text-muted">
                  {categoryLabel(p.category_slug, "en")} · {p.cities.length} ville(s) · {Math.round(p.commission * 10000) / 100} %
                  {st.won > 0 ? <> · <span className="font-bold text-text">{st.won} devis gagné(s)</span></> : null}
                  {st.rented > 0 ? <> · {st.rented} réal.</> : null}
                  {st.commissionEur > 0 ? <> · <span className="font-data font-bold text-text">{st.commissionEur.toFixed(2)} €</span></> : null}
                </span>
              </summary>

              <div className="border-t border-border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-text-muted">
                    <a href={`mailto:${p.email}`} className="text-sea">{p.email}</a>
                    {p.phone ? <> · {p.phone}</> : null}
                    {p.whatsapp && p.whatsapp !== p.phone ? <> · WA {p.whatsapp}</> : null}
                    {" · "}{p.lead_routing}
                    {" · depuis "}{new Date(p.created_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Athens" })}
                    {" · "}{st.invites} invitation(s)
                    {p.languages.length > 0 ? <> · langues : {p.languages.join(", ")}</> : null}
                  </span>
                  <form action={togglePartnerActive.bind(null, p.id, !p.active)} className="ml-auto">
                    <button className="rounded-full border border-border bg-white px-3 py-1 font-bold">
                      {p.active ? "Désactiver" : "Activer"}
                    </button>
                  </form>
                </div>

                <div className="text-xs text-text-muted">
                  {perf.invited} invité(s) · {perf.quoted} chiffré(s) · {perf.chosen} choisi(s) · {perf.declined} désisté(s)
                  {perf.avgQuotePriceEur != null ? ` · prix moy ${perf.avgQuotePriceEur.toFixed(0)} €` : ""}
                  {perf.responseRate != null ? ` · réponse ${Math.round(perf.responseRate * 100)} %` : ""}
                  {perf.avgResponseHours != null ? ` · délai moy ${perf.avgResponseHours.toFixed(1)}h` : ""}
                </div>

                <form action={updatePartner.bind(null, p.id)} className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
                  <label className="flex items-center gap-1.5">
                    catégorie
                    <select name="category_slug" defaultValue={p.category_slug} className="rounded-lg border border-border px-2 py-1">
                      {CATEGORY_SLUGS.map((s) => (
                        <option key={s} value={s}>{categoryLabel(s, "en")}</option>
                      ))}
                    </select>
                  </label>
                  {CITY_SLUGS.map((c) => (
                    <label key={c} className="flex items-center gap-1.5">
                      <input type="checkbox" name={`city-${c}`} defaultChecked={p.cities.includes(c)} />
                      {cityLabel(c, "en")}
                    </label>
                  ))}
                  <label className="flex items-center gap-1.5">
                    commission
                    <input name="commissionPct" inputMode="decimal" defaultValue={Math.round(p.commission * 10000) / 100}
                           className="w-16 rounded-lg border border-border px-2 py-1" aria-label="Commission (%)" />
                    %
                  </label>
                  <button className="rounded-full bg-sea px-3 py-1 font-bold text-white">Enregistrer</button>
                </form>
              </div>
            </details>
          );
        })}
        {rows.length === 0 ? <div className="rounded-2xl border border-border bg-white p-6 text-center text-sm text-text-muted">Aucun prestataire ne correspond.</div> : null}
      </div>
    </section>
  );
}
