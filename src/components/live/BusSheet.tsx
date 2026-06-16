"use client";
import { useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import type { BusSheetVM } from "@/lib/bus-live";

const L: Record<string, { next: string; arrival: string; imminent: string; estimated: string; viewLine: string; close: string }> = {
  en: { next: "Next", arrival: "Arrival", imminent: "Arriving", estimated: "estimated", viewLine: "View line", close: "Close" },
  fr: { next: "Prochain", arrival: "Arrivée", imminent: "Arrivée imminente", estimated: "estimé", viewLine: "Voir la ligne", close: "Fermer" },
  de: { next: "Nächster", arrival: "Ankunft", imminent: "Kommt an", estimated: "geschätzt", viewLine: "Linie ansehen", close: "Schließen" },
  el: { next: "Επόμενη", arrival: "Άφιξη", imminent: "Καταφθάνει", estimated: "εκτίμηση", viewLine: "Δείτε τη γραμμή", close: "Κλείσιμο" },
};

export function BusSheet({ vm, locale, onClose }: { vm: BusSheetVM; locale: string; onClose: () => void }) {
  const t = L[locale] ?? L.en;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`${vm.code} ${vm.origin} → ${vm.destination}`}
      tabIndex={-1}
      className="absolute inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md rounded-t-2xl bg-white p-4 shadow-2xl outline-none"
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" aria-hidden />
      <button
        type="button"
        onClick={onClose}
        aria-label={t.close}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-text/60 hover:bg-black/5"
      >
        ✕
      </button>

      <div className="flex items-center gap-2 text-sm text-text/60">
        <span className="rounded-md bg-aegean px-2 py-0.5 font-data text-xs font-bold text-white">{vm.code}</span>
        <span>{vm.operatorLabel}</span>
      </div>

      <p className="mt-1 font-heading text-lg font-bold text-text">
        {vm.origin} <span className="text-terra">→</span> {vm.destination}
      </p>

      <div className="mt-3 space-y-1.5 border-t border-black/10 pt-3 text-sm">
        <p>
          <span className="text-text/60">{t.next} : </span>
          {vm.nextStop ? (
            <span className="font-medium text-text">
              {vm.nextStop.name}{" "}
              <span className="font-data text-text/60">~{vm.nextStop.etaMin} min (≈{vm.nextStop.clock})</span>
            </span>
          ) : (
            <span className="font-medium text-text">{t.imminent}</span>
          )}
        </p>
        {vm.terminus && (
          <p>
            <span className="text-text/60">{t.arrival} : </span>
            <span className="font-medium text-text">
              {vm.destination} <span className="font-data text-text/60">≈{vm.terminus.clock}</span>
            </span>
            {vm.terminus.estimated && <span className="text-text/60"> · {t.estimated}</span>}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-sun" style={{ width: `${vm.progressPct}%` }} />
        </div>
        <span className="font-data text-xs tabular-nums text-text/60">{vm.progressPct}%</span>
      </div>

      {vm.lineHref && (
        <Link
          href={vm.lineHref}
          className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-aegean px-5 py-2.5 font-heading text-sm font-semibold text-white transition hover:bg-aegean/90"
        >
          {t.viewLine} →
        </Link>
      )}
    </div>
  );
}
