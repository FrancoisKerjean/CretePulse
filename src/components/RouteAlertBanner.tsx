import { TriangleAlert, ExternalLink } from "lucide-react";
import type { BusAlert } from "@/lib/bus-alerts";

// Bandeau d'avertissement affiché sur une page de trajet (/buses/[pair]) UNIQUEMENT
// quand une alerte service KTEL concerne l'un des deux lieux du trajet (filtré en amont
// par matched_routes). Additif : ne touche pas le bandeau global de /buses.
const T: Record<string, Record<string, string>> = {
  title: {
    en: "Service alert on this route", fr: "Alerte service sur ce trajet",
    de: "Betriebsmeldung für diese Strecke", el: "Ειδοποίηση για αυτή τη γραμμή",
  },
  source: {
    en: "Click to read the official notice before travelling.",
    fr: "Cliquez pour lire l'avis officiel avant de partir.",
    de: "Vor der Reise den offiziellen Hinweis lesen.",
    el: "Διαβάστε την επίσημη ανακοίνωση πριν ταξιδέψετε.",
  },
};

export function RouteAlertBanner({ alerts, locale }: { alerts: BusAlert[]; locale: string }) {
  if (!alerts.length) return null;
  const tr = (m: Record<string, string>) => m[locale] ?? m.en;
  return (
    <div className="mb-6 rounded-[20px] border border-amber-300 bg-amber-50 px-5 py-4">
      <div className="flex items-center gap-2 mb-2.5">
        <TriangleAlert className="w-5 h-5 text-amber-700 shrink-0" />
        <p className="font-heading font-bold text-sm text-amber-900 m-0">{tr(T.title)}</p>
      </div>
      <ul className="space-y-2 list-none p-0 m-0">
        {alerts.map((a) => (
          <li key={a.slug} className="text-sm leading-snug">
            <a
              href={a.url}
              rel="nofollow noopener"
              target="_blank"
              className="text-amber-900 font-semibold hover:underline inline-flex items-start gap-1"
            >
              {a.title}
              <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
            </a>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-amber-700 mt-2.5 mb-0">{tr(T.source)}</p>
    </div>
  );
}
