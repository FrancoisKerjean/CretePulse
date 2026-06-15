"use client";

import { useId, useState } from "react";
import { TriangleAlert, ChevronDown, ExternalLink } from "lucide-react";
import type { BusAlert } from "@/lib/bus-alerts";
import { ALERT_I18N, alertSource, alertSummary, trAlert } from "@/components/serviceAlert";

// Barre d'alerte service KTEL, repliée par défaut (≈40px). Le détail reste
// toujours rendu dans le DOM SSR (masqué en CSS quand replié, jamais via
// `{open && …}`) -> aucune perte de maillage SEO. Remplace BusAlertsBanner
// (variant "global", /buses) et RouteAlertBanner (variant "route", /buses/[pair]).
export function ServiceAlertBar({
  alerts,
  locale,
  variant,
}: {
  alerts: BusAlert[];
  locale: string;
  variant: "global" | "route";
}) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  if (alerts.length === 0) return null;

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={detailId}
        aria-label={trAlert(ALERT_I18N.toggleAria, locale)}
        className="flex w-full items-center gap-2 rounded-[14px] border border-amber-300 bg-amber-50 px-4 py-2.5 text-left hover:bg-amber-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <TriangleAlert className="w-4 h-4 text-amber-700 shrink-0" />
        <span className="text-sm font-semibold text-amber-900 line-clamp-1">
          {alertSummary(alerts, locale)}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-amber-700 ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        id={detailId}
        className={`overflow-hidden transition-all duration-200 motion-reduce:transition-none ${
          open ? "max-h-[1000px] opacity-100 mt-2" : "max-h-0 opacity-0"
        }`}
      >
        <div className="rounded-[14px] border border-amber-300 bg-amber-50 px-4 py-3">
          <ul className="space-y-2 list-none p-0 m-0">
            {alerts.map((a) => (
              <li key={a.slug} className="text-sm leading-snug">
                <a
                  href={a.url}
                  target="_blank"
                  rel="nofollow noopener"
                  className="inline-flex items-start gap-1 font-semibold text-amber-900 hover:underline"
                >
                  {a.published_date && (
                    <span className="font-data text-xs text-amber-700 mr-1.5">
                      {new Date(a.published_date).toLocaleDateString(locale)}
                    </span>
                  )}
                  {a.title}
                  <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-700 mt-2.5 mb-0">{alertSource(variant, locale)}</p>
        </div>
      </div>
    </div>
  );
}
