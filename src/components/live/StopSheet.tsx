"use client";
import { useEffect, useRef, useState } from "react";
import type { CityBusArrival } from "@/app/api/buses/citybus-live/[stop]/route";

const L: Record<string, {
  arrivals: string;
  next: string;
  arriving: string;
  noService: string;
  min: string;
  close: string;
  loading: string;
  realtime: string;
}> = {
  en: {
    arrivals: "Upcoming buses",
    next: "min",
    arriving: "Arriving",
    noService: "No buses scheduled at this stop right now",
    min: "min",
    close: "Close",
    loading: "Loading...",
    realtime: "Live data",
  },
  fr: {
    arrivals: "Prochains passages",
    next: "min",
    arriving: "Arrivée imminente",
    noService: "Aucun bus prévu à cet arrêt pour l'instant",
    min: "min",
    close: "Fermer",
    loading: "Chargement...",
    realtime: "Données en direct",
  },
  de: {
    arrivals: "Nächste Busse",
    next: "Min",
    arriving: "Kommt an",
    noService: "Keine Busse an dieser Haltestelle geplant",
    min: "Min",
    close: "Schließen",
    loading: "Laden...",
    realtime: "Live-Daten",
  },
  el: {
    arrivals: "Επόμενα λεωφορεία",
    next: "λεπτά",
    arriving: "Φτάνει τώρα",
    noService: "Δεν υπάρχουν λεωφορεία σε αυτή τη στάση αυτή τη στιγμή",
    min: "λεπτά",
    close: "Κλείσιμο",
    loading: "Φόρτωση...",
    realtime: "Ζωντανά δεδομένα",
  },
};

export interface StopSheetProps {
  stopName: string;
  stopApiCode: string;
  city: "her" | "cha";
  lineColor: string | null;   // couleur de la ligne (pour la puce colorée)
  locale: string;
  onClose: () => void;
}

export function StopSheet({ stopName, stopApiCode, city, lineColor, locale, onClose }: StopSheetProps) {
  const t = L[locale] ?? L.en;
  const ref = useRef<HTMLDivElement>(null);
  const [arrivals, setArrivals] = useState<CityBusArrival[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    ref.current?.focus();
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`/api/buses/citybus-live/${stopApiCode}?city=${city}`, { cache: "no-store" });
        if (!r.ok || cancelled) { setError(true); return; }
        const data = (await r.json()) as { arrivals?: CityBusArrival[] };
        if (!cancelled) setArrivals(data.arrivals ?? []);
      } catch {
        if (!cancelled) setError(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [stopApiCode, city]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={stopName}
      tabIndex={-1}
      className="absolute inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md rounded-t-2xl bg-white p-4 shadow-float outline-none"
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

      {/* En-tête de l'arrêt */}
      <div className="flex items-center gap-2">
        {lineColor && (
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
            style={{ background: lineColor }}
            aria-hidden
          />
        )}
        <p className="font-heading text-base font-bold text-text leading-snug">{stopName}</p>
      </div>

      <div className="mt-1 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-live-pulse" aria-hidden />
        <span className="text-xs text-text/60">{t.realtime}</span>
      </div>

      {/* Liste des passages */}
      <div className="mt-3 border-t border-black/10 pt-3 space-y-2">
        {arrivals === null && !error && (
          <p className="text-sm text-text/60 py-2">{t.loading}</p>
        )}
        {error && (
          <p className="text-sm text-text/60 py-2">{t.noService}</p>
        )}
        {arrivals !== null && arrivals.length === 0 && (
          <p className="text-sm text-text/60 py-2">{t.noService}</p>
        )}
        {arrivals !== null && arrivals.map((a, i) => (
          <div key={i} className="flex items-center gap-3">
            {/* Badge ligne coloré */}
            <span
              className="shrink-0 rounded-md px-2 py-0.5 font-data text-xs font-bold"
              style={{
                background: a.color ?? "#0B5E78",
                color: a.textColor ?? "#fff",
              }}
            >
              {a.lineCode}
            </span>
            {/* Destination */}
            <span className="flex-1 text-sm text-text truncate">{a.routeName}</span>
            {/* Temps */}
            <span className="shrink-0 font-data text-sm font-bold tabular-nums text-sea">
              {a.etaMin === 0 ? (
                <span className="text-green-600">{t.arriving}</span>
              ) : (
                <>{a.etaMin} {t.min}</>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
