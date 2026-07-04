// Vue Partenaires : registre car_partners + stats calculées. Écritures :
// toggle active + zones/commission (forms natifs → server actions).
// Pas de création ici : l'auto-enroll signup + INSERT SQL couvrent l'onboarding.
import { partnerStats, ZONE_IDS, type AdminPartner, type AdminRequest } from "@/lib/car-admin";
import { togglePartnerActive, updatePartner } from "./actions";

export function PartnersTable({
  partners, requests, invitesByPartner, partnersById,
}: {
  partners: AdminPartner[];
  requests: AdminRequest[];
  invitesByPartner: Map<number, number>;
  partnersById: Map<number, AdminPartner>;
}) {
  return (
    <section className="mt-5 space-y-3">
      {partners.map((p) => {
        const st = partnerStats(p.id, requests, invitesByPartner, partnersById);
        return (
          <div key={p.id} className={`rounded-2xl border bg-white p-4 ${p.active ? "border-border" : "border-terracotta opacity-70"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading text-lg font-bold">{p.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.active ? "bg-ok text-white" : "bg-terracotta text-white"}`}>
                {p.active ? "actif" : "inactif"}
              </span>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs">{p.lead_routing}</span>
              {p.outreach_status ? <span className="rounded-full bg-sky px-2 py-0.5 text-xs font-bold text-night">{p.outreach_status}</span> : null}
              <form action={togglePartnerActive.bind(null, p.id, !p.active)} className="ml-auto">
                <button className="rounded-full border border-border bg-white px-3 py-1 text-sm font-bold">
                  {p.active ? "Désactiver" : "Activer"}
                </button>
              </form>
            </div>

            <div className="mt-1 text-sm text-text-muted">
              <a href={`mailto:${p.email}`} className="text-sea">{p.email}</a>
              {p.phone ? <> · {p.phone}</> : null}
              {p.whatsapp && p.whatsapp !== p.phone ? <> · WA {p.whatsapp}</> : null}
              {" · depuis "}{new Date(p.created_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Athens" })}
            </div>

            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <span>{st.invites} invitation(s)</span>
              <span>{st.won} devis gagné(s)</span>
              <span>{st.rented} location(s)</span>
              <span className="font-data font-bold">{st.commissionEur.toFixed(2)} € de commission générée</span>
            </div>

            <form action={updatePartner.bind(null, p.id)} className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm">
              {ZONE_IDS.map((z) => (
                <label key={z} className="flex items-center gap-1.5">
                  <input type="checkbox" name={`zone-${z}`} defaultChecked={p.zone_ids.includes(z)} />
                  {z}
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
        );
      })}
      {partners.length === 0 ? <div className="rounded-2xl border border-border bg-white p-6 text-center text-sm text-text-muted">Aucun partenaire en base.</div> : null}
    </section>
  );
}
