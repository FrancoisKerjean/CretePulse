// Bandeau KPI (server component pur) : agrégats 7 j / 30 j. Métrique non calculable
// (dénominateur 0) → affichée "n/d", jamais un ratio inventé.
import type { CockpitKpis, DepositKpis } from "@/lib/car-monitoring";

const pct = (r: number | null): string => (r == null ? "n/d" : `${Math.round(r * 100)} %`);
const num = (r: number | null, d = 1): string => (r == null ? "n/d" : r.toFixed(d));

function Cell({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2">
      <div className="text-[11px] text-text-muted">{label}</div>
      <div className="font-data text-sm font-bold">{v}</div>
    </div>
  );
}

function Window({ title, k }: { title: string; k: CockpitKpis }) {
  return (
    <div className="flex-1">
      <div className="mb-1 text-xs font-bold text-text-muted">{title} ({k.count} demandes)</div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <Cell label="taux de devis" v={pct(k.quoteRate)} />
        <Cell label="devis / demande" v={num(k.avgQuotesPerRequest)} />
        <Cell label="délai médian 1er devis" v={k.medianFirstQuoteHours == null ? "n/d" : `${num(k.medianFirstQuoteHours)}h`} />
        <Cell label="taux de choix" v={pct(k.choiceRate)} />
        <Cell label="désist. loueur" v={pct(k.partnerDeclineRate)} />
        <Cell label="décline client" v={pct(k.clientDeclineRate)} />
        <Cell label="effic. relance loueur" v={pct(k.partnerRelanceEfficacy)} />
        <Cell label="effic. relance client" v={pct(k.clientRelanceEfficacy)} />
        <Cell label="invites silencieuses" v={pct(k.silentInviteRate)} />
      </div>
    </div>
  );
}

const REFUND_LABELS: [keyof DepositKpis["refundsByReason"], string][] = [
  ["partner_declined", "refus"], ["partner_timeout", "sans réponse"], ["client_cancelled", "client"],
  ["partner_cancelled", "loueur annule"], ["ops", "ops"],
];

/** Les 6 indicateurs d'acompte (30 jours). Un ratio sans dénominateur s'affiche 0 %. */
function DepositBand({ d }: { d: DepositKpis }) {
  const refunds = REFUND_LABELS.map(([k, l]) => `${l} ${d.refundsByReason[k]}`).join(" · ");
  return (
    <div>
      <div className="mb-1 text-xs font-bold text-text-muted">Acomptes (30 jours)</div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
        <Cell label="couverture catalogue" v={pct(d.catalogueCoverage)} />
        <Cell label="offre vers acompte" v={pct(d.offerToDeposit)} />
        <Cell label="taux de confirmation" v={pct(d.confirmRate)} />
        <Cell label="délai médian de confirmation" v={d.medianConfirmMinutes == null ? "n/d" : `${Math.round(d.medianConfirmMinutes)} min`} />
        <Cell label="remboursements par motif" v={refunds} />
        <Cell label="commission acomptes" v={`${d.commissionEur.toFixed(2)} €`} />
      </div>
    </div>
  );
}

export function KpiBand({ k7, k30, deposit }: { k7: CockpitKpis; k30: CockpitKpis; deposit: DepositKpis }) {
  return (
    <section className="mt-5 flex flex-col gap-4 rounded-xl border border-border bg-sand/30 p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Window title="7 jours" k={k7} />
        <Window title="30 jours" k={k30} />
      </div>
      <DepositBand d={deposit} />
    </section>
  );
}
