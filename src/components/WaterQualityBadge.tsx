import { Droplet } from "lucide-react";
import type { WaterQuality } from "@/lib/bathing-water";

// Badge qualité de l'eau de baignade (Directive UE 2006/7/CE).
// Libellé public « UE 2026 » (année du rapport AEE), cohérent avec la campagne
// crete.direct ; le classement mesure la saison 2025. Présentationnel pur :
// importable côté serveur (fiches /beaches) comme client (/explore).

const WQ_LABELS: Record<string, { title: string; source: string; status: Record<string, string> }> = {
  en: { title: "Bathing water · EU 2026", source: "Source: EEA (2026 report)", status: { excellent: "Excellent", good: "Good", sufficient: "Sufficient", poor: "Poor" } },
  fr: { title: "Eau de baignade · UE 2026", source: "Source : AEE (rapport 2026)", status: { excellent: "Excellente", good: "Bonne", sufficient: "Suffisante", poor: "Médiocre" } },
  de: { title: "Badewasser · EU 2026", source: "Quelle: EUA (Bericht 2026)", status: { excellent: "Ausgezeichnet", good: "Gut", sufficient: "Ausreichend", poor: "Mangelhaft" } },
  el: { title: "Νερά κολύμβησης · ΕΕ 2026", source: "Πηγή: ΕΟΠ (έκθεση 2026)", status: { excellent: "Εξαιρετικά", good: "Καλά", sufficient: "Επαρκή", poor: "Κακά" } },
};
const WQ_STYLE: Record<string, string> = {
  excellent: "bg-emerald-50 text-emerald-800 border-emerald-200",
  good: "bg-sky-50 text-sky-800 border-sky-200",
  sufficient: "bg-amber-50 text-amber-800 border-amber-200",
  poor: "bg-red-50 text-red-800 border-red-200",
};

export function wqStatusLabel(status: string, locale: string): string {
  return (WQ_LABELS[locale] || WQ_LABELS.en).status[status] || status;
}

/**
 * Badge qualité de l'eau. `variant="pill"` = pastille compacte (listes) ;
 * `variant="full"` (défaut) = bloc titre + classement + source.
 */
export function WaterQualityBadge({
  wq,
  locale,
  variant = "full",
  className = "",
}: {
  wq: WaterQuality;
  locale: string;
  variant?: "full" | "pill";
  className?: string;
}) {
  const L = WQ_LABELS[locale] || WQ_LABELS.en;
  const style = WQ_STYLE[wq.status] || WQ_STYLE.excellent;

  if (variant === "pill") {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${style} ${className}`}>
        <Droplet size={9} fill="currentColor" /> {wqStatusLabel(wq.status, locale)}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${style} ${className}`}>
      <Droplet size={18} fill="currentColor" className="shrink-0 opacity-80" />
      <div className="min-w-0">
        <div className="text-xs font-bold leading-tight">{L.title} : {L.status[wq.status] || wq.status}</div>
        <div className="text-[10px] opacity-70 leading-tight">{L.source}</div>
      </div>
    </div>
  );
}
