"use client";

// Bloc "conditions maintenant" des pages plages. La page reste en ISR 48 h :
// ce composant client va chercher le live sur /api/beach-conditions/[slug]
// (cache CDN 30 min). Si la météo est indisponible, le bloc disparaît
// proprement (aucune donnée inventée, pas de squelette persistant).
// Spec : docs/SPEC-BEACHES-DATA.md (lot 1)
import { useEffect, useState } from "react";
import { Wind, Waves, Thermometer } from "lucide-react";
import Link from "next/link";

interface Conditions {
  score: number;
  rating: "calm" | "fair" | "exposed";
  shoreWind: "offshore" | "cross" | "onshore";
  windSpeed: number;
  windCardinal: string;
  waveHeight: number | null;
  seaTemp: number | null;
  airTemp: number;
  cityName: string;
  cityKm: number;
}

const LABELS: Record<string, {
  title: string;
  rating: Record<Conditions["rating"], string>;
  shoreWind: Record<Conditions["shoreWind"], string>;
  wind: string;
  waves: string;
  seaTemp: string;
  air: string;
  station: (city: string, km: number) => string;
  method: string;
  todayLink: string;
}> = {
  en: {
    title: "Conditions right now",
    rating: { calm: "Calm water", fair: "Fair", exposed: "Choppy / exposed" },
    shoreWind: { offshore: "wind from land, flat shoreline", cross: "cross-shore wind", onshore: "wind from the sea, expect chop" },
    wind: "Wind",
    waves: "Waves",
    seaTemp: "Sea",
    air: "Air",
    station: (city, km) => `Weather station: ${city} (${km} km). Geometric estimate, individual bays can differ.`,
    method: "Updated every 30 min",
    todayLink: "Where to swim today: full island ranking",
  },
  fr: {
    title: "Conditions en ce moment",
    rating: { calm: "Eau calme", fair: "Correct", exposed: "Agitée / exposée" },
    shoreWind: { offshore: "vent de terre, bord plat", cross: "vent de travers", onshore: "vent de mer, clapot probable" },
    wind: "Vent",
    waves: "Vagues",
    seaTemp: "Mer",
    air: "Air",
    station: (city, km) => `Station météo : ${city} (${km} km). Estimation géométrique, chaque baie peut différer.`,
    method: "Actualisé toutes les 30 min",
    todayLink: "Où se baigner aujourd'hui : classement complet de l'île",
  },
  de: {
    title: "Bedingungen jetzt",
    rating: { calm: "Ruhiges Wasser", fair: "Passabel", exposed: "Kabbelig / exponiert" },
    shoreWind: { offshore: "Wind vom Land, flaches Ufer", cross: "Seitenwind", onshore: "Wind vom Meer, Wellengang möglich" },
    wind: "Wind",
    waves: "Wellen",
    seaTemp: "Meer",
    air: "Luft",
    station: (city, km) => `Wetterstation: ${city} (${km} km). Geometrische Schätzung, einzelne Buchten können abweichen.`,
    method: "Alle 30 Min. aktualisiert",
    todayLink: "Wo heute baden: komplettes Insel-Ranking",
  },
  el: {
    title: "Συνθήκες τώρα",
    rating: { calm: "Ήρεμα νερά", fair: "Μέτρια", exposed: "Κυματώδης / εκτεθειμένη" },
    shoreWind: { offshore: "άνεμος από τη στεριά, ήρεμη ακτή", cross: "πλάγιος άνεμος", onshore: "άνεμος από τη θάλασσα, πιθανός κυματισμός" },
    wind: "Άνεμος",
    waves: "Κύματα",
    seaTemp: "Θάλασσα",
    air: "Αέρας",
    station: (city, km) => `Μετεωρολογικός σταθμός: ${city} (${km} χλμ). Γεωμετρική εκτίμηση, κάθε κόλπος μπορεί να διαφέρει.`,
    method: "Ενημέρωση κάθε 30 λεπτά",
    todayLink: "Πού για μπάνιο σήμερα: πλήρης κατάταξη",
  },
};

const RATING_STYLES: Record<Conditions["rating"], string> = {
  calm: "bg-emerald-50 text-emerald-800 border-emerald-200",
  fair: "bg-amber-50 text-amber-800 border-amber-200",
  exposed: "bg-red-50 text-red-800 border-red-200",
};

export function BeachConditionsLive({ slug, locale }: { slug: string; locale: string }) {
  const [cond, setCond] = useState<Conditions | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/beach-conditions/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (!cancelled) setCond(d); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [slug]);

  if (failed) return null;
  const L = LABELS[locale] ?? LABELS.en;

  return (
    <section className="mb-8 rounded-xl border border-border bg-white p-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-base font-bold text-sea">{L.title}</h2>
        <span className="text-[10px] text-text-light">{L.method}</span>
      </div>
      {!cond ? (
        <div className="h-16 rounded-lg bg-surface animate-pulse" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full border ${RATING_STYLES[cond.rating]}`}>
              {L.rating[cond.rating]}
            </span>
            <span className="text-sm text-text-muted">{L.shoreWind[cond.shoreWind]}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Wind className="w-4 h-4 text-sea shrink-0" />
              <span><span className="text-text-muted">{L.wind}</span>{" "}
                <strong>{cond.windSpeed} km/h {cond.windCardinal}</strong></span>
            </div>
            {cond.waveHeight !== null && (
              <div className="flex items-center gap-2 text-sm">
                <Waves className="w-4 h-4 text-sea shrink-0" />
                <span><span className="text-text-muted">{L.waves}</span>{" "}
                  <strong>{cond.waveHeight.toFixed(1)} m</strong></span>
              </div>
            )}
            {cond.seaTemp !== null && (
              <div className="flex items-center gap-2 text-sm">
                <Thermometer className="w-4 h-4 text-sea shrink-0" />
                <span><span className="text-text-muted">{L.seaTemp}</span>{" "}
                  <strong>{cond.seaTemp}°C</strong></span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Thermometer className="w-4 h-4 text-amber-500 shrink-0" />
              <span><span className="text-text-muted">{L.air}</span>{" "}
                <strong>{cond.airTemp}°C</strong></span>
            </div>
          </div>
          <p className="text-[10px] text-text-light mt-3">{L.station(cond.cityName, cond.cityKm)}</p>
          <Link href={`/${locale}/beaches/today`} className="inline-block text-xs text-sea hover:underline mt-1">
            {L.todayLink} →
          </Link>
        </>
      )}
    </section>
  );
}
