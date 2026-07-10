// src/components/explore/NowPanel.tsx : panneau « Maintenant près de toi » (lot 2).
// Rendu en tête du carrousel mobile d'/explore quand la géoloc est active.
// Meilleure plage du moment (swim-now, score pondéré distance, pattern NearMeClient)
// + prochain bus à l'arrêt le plus proche (live citybus HER/CHA si dispo).
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { haversineKm } from "@/lib/geo";
import type { NearestStop } from "@/lib/nearest-stop";

type Pos = { lat: number; lon: number };
type SwimBeach = { slug: string; name: string; score: number; rating: string; lat: number; lng: number };
type Arrival = { lineCode: string; lineName: string; etaMin: number; color: string };

const T: Record<string, Record<string, string>> = {
  en: { nowTitle: "Right now, near you", beachNow: "Best beach now", nextBus: "Next bus", inMin: "min", planJourney: "Plan a journey", km: "km" },
  fr: { nowTitle: "Maintenant, près de toi", beachNow: "Meilleure plage là", nextBus: "Prochain bus", inMin: "min", planJourney: "Planifier un trajet", km: "km" },
  de: { nowTitle: "Jetzt, in deiner Nähe", beachNow: "Bester Strand jetzt", nextBus: "Nächster Bus", inMin: "Min", planJourney: "Route planen", km: "km" },
  el: { nowTitle: "Τώρα, κοντά σου", beachNow: "Καλύτερη παραλία τώρα", nextBus: "Επόμενο λεωφορείο", inMin: "λεπ", planJourney: "Σχεδίασε διαδρομή", km: "χλμ" },
};

/** Score pondéré distance (pattern NearMeClient) : au-delà de ~50 km une plage
 *  mieux notée ne compense plus. */
function weighted(score: number, km: number): number {
  return score - Math.min(40, km * 0.8);
}

export function NowPanel({ pos, locale }: { pos: Pos; locale: string }) {
  const t = T[locale] || T.en;
  const [beach, setBeach] = useState<(SwimBeach & { km: number }) | null>(null);
  const [stop, setStop] = useState<NearestStop | null>(null);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const shownSent = useRef(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      const [swimRes, stopRes] = await Promise.allSettled([
        fetch(`/api/swim-now?locale=${locale}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/buses/nearest-stop?lat=${pos.lat}&lng=${pos.lon}`).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (dead) return;
      if (swimRes.status === "fulfilled" && swimRes.value) {
        const all: (SwimBeach & { km: number })[] = [];
        for (const region of swimRes.value.regions ?? []) {
          for (const b of region.beaches ?? []) {
            if (typeof b.lat === "number" && typeof b.lng === "number") {
              all.push({ ...b, km: haversineKm([b.lat, b.lng], [pos.lat, pos.lon]) });
            }
          }
        }
        all.sort((x, y) => weighted(y.score, y.km) - weighted(x.score, x.km));
        setBeach(all[0] ?? null);
      }
      if (stopRes.status === "fulfilled" && stopRes.value) setStop(stopRes.value.stop ?? null);
    })();
    return () => {
      dead = true;
    };
  }, [pos.lat, pos.lon, locale]);

  // Live bus : poll 30 s (cache proxy 10 s), pause si onglet caché.
  useEffect(() => {
    if (!stop?.apiCode || !stop.liveCity) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let dead = false;
    const apiCode = stop.apiCode;
    const city = stop.liveCity;
    async function tick() {
      if (dead) return;
      if (!document.hidden) {
        try {
          const r = await fetch(`/api/buses/citybus-live/${apiCode}?city=${city}&lang=${locale === "el" ? "el" : "en"}`);
          if (r.ok) {
            const j = await r.json();
            if (!dead) setArrival((j.arrivals ?? [])[0] ?? null);
          }
        } catch {
          // silencieux : le panneau retombe sur le lien planner
        }
      }
      timer = setTimeout(tick, 30_000);
    }
    tick();
    return () => {
      dead = true;
      if (timer) clearTimeout(timer);
    };
  }, [stop, locale]);

  useEffect(() => {
    if (!shownSent.current && (beach || stop)) {
      shownSent.current = true;
      window.plausible?.("now_panel_shown", { props: { hasLiveBus: String(Boolean(stop?.liveCity)) } });
    }
  }, [beach, stop]);

  if (!beach && !stop) return null;
  return (
    <div className="pointer-events-auto w-[15.5rem] shrink-0 snap-start rounded-2xl border-2 border-border bg-white p-3 shadow-[0_12px_32px_rgba(11,94,120,.10)]">
      <p className="m-0 mb-2 font-heading text-[13px] font-bold text-ink">{t.nowTitle}</p>
      {beach && (
        <Link
          href={`/${locale}/beaches/${beach.slug}`}
          onClick={() => window.plausible?.("now_panel_click", { props: { target: "beach" } })}
          className="flex items-center gap-2 rounded-xl border border-border p-2 no-underline"
        >
          <span aria-hidden>🏖️</span>
          <span className="min-w-0 flex-1">
            <b className="block truncate font-heading text-[13px] text-ink">{beach.name}</b>
            <span className="text-[11px] text-text-muted">
              {t.beachNow} · {beach.km < 10 ? beach.km.toFixed(1) : Math.round(beach.km)} {t.km}
            </span>
          </span>
          <span className="rounded-full bg-sea-faint px-2 py-0.5 font-heading text-[11px] font-bold text-sea">{beach.score}</span>
        </Link>
      )}
      {stop && (
        <Link
          href={`/${locale}/buses`}
          onClick={() => window.plausible?.("now_panel_click", { props: { target: "bus" } })}
          className="mt-2 flex items-center gap-2 rounded-xl border border-border p-2 no-underline"
        >
          <span aria-hidden>🚌</span>
          <span className="min-w-0 flex-1">
            <b className="block truncate font-heading text-[13px] text-ink">{stop.name}</b>
            <span className="text-[11px] text-text-muted">
              {(stop.km < 10 ? stop.km.toFixed(1) : Math.round(stop.km))} {t.km} · {arrival ? t.nextBus : t.planJourney}
            </span>
          </span>
          {arrival && (
            <span className="inline-flex items-center gap-1 font-heading text-[13px] font-bold" style={{ color: "#0E8A50" }}>
              <span className="rounded px-1.5 py-0.5 text-white" style={{ backgroundColor: arrival.color || "#1D9BF0" }}>
                {arrival.lineCode}
              </span>
              {arrival.etaMin} {t.inMin}
            </span>
          )}
        </Link>
      )}
    </div>
  );
}
