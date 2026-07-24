// src/components/explore/NowPanel.tsx : panneau « Maintenant près de toi » (lot 2, v2).
// Rendu en tête du carrousel mobile d'/explore quand la géoloc est active.
// Top 3 plages réellement proches (swim-near, scoring par position rayon 25 km)
// + prochain bus à l'arrêt le plus proche (live citybus HER/CHA si dispo).
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { haversineKm } from "@/lib/geo";
import type { NearestStop } from "@/lib/nearest-stop";

type Pos = { lat: number; lon: number };
type SwimBeach = { slug: string; name: string; score: number; rating: string; lat: number; lng: number; km: number };
type Arrival = { lineCode: string; lineName: string; etaMin: number; color: string };

const T: Record<string, Record<string, string>> = {
  en: { nowTitle: "Right now, near you", beachNow: "Best beach now", nextBus: "Next bus", inMin: "min", planJourney: "Plan a journey", km: "km" },
  fr: { nowTitle: "Maintenant, près de toi", beachNow: "Meilleure plage là", nextBus: "Prochain bus", inMin: "min", planJourney: "Planifier un trajet", km: "km" },
  de: { nowTitle: "Jetzt, in deiner Nähe", beachNow: "Bester Strand jetzt", nextBus: "Nächster Bus", inMin: "Min", planJourney: "Route planen", km: "km" },
  el: { nowTitle: "Τώρα, κοντά σου", beachNow: "Καλύτερη παραλία τώρα", nextBus: "Επόμενο λεωφορείο", inMin: "λεπ", planJourney: "Σχεδίασε διαδρομή", km: "χλμ" },
};

export function NowPanel({ pos, locale }: { pos: Pos; locale: string }) {
  const t = T[locale] || T.en;
  const [beaches, setBeaches] = useState<SwimBeach[]>([]);
  const [stop, setStop] = useState<NearestStop | null>(null);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const shownSent = useRef(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      // Position arrondie à 0.05° (~3-5 km) : URL stable donc cache CDN efficace,
      // position exacte jamais envoyée. La distance affichée est recalculée en exact.
      const q = (v: number) => (Math.round(v / 0.05) * 0.05).toFixed(2);
      const [swimRes, stopRes] = await Promise.allSettled([
        fetch(`/api/swim-near?lat=${q(pos.lat)}&lng=${q(pos.lon)}&locale=${locale}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/buses/nearest-stop?lat=${pos.lat}&lng=${pos.lon}`).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (dead) return;
      if (swimRes.status === "fulfilled" && swimRes.value) {
        const list: SwimBeach[] = (swimRes.value.beaches ?? [])
          .filter((b: SwimBeach) => typeof b.lat === "number" && typeof b.lng === "number")
          .map((b: SwimBeach) => ({ ...b, km: haversineKm([b.lat, b.lng], [pos.lat, pos.lon]) }));
        setBeaches(list.slice(0, 3));
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
    if (!shownSent.current && (beaches.length > 0 || stop)) {
      shownSent.current = true;
      window.plausible?.("now_panel_shown", { props: { hasLiveBus: String(Boolean(stop?.liveCity)) } });
      // Le panneau se monte après ses fetchs : le carrousel est déjà ancré sur
      // la carte suivante. On se ramène en vue (scroll horizontal uniquement).
      rootRef.current?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }
  }, [beaches, stop]);

  if (beaches.length === 0 && !stop) return null;
  return (
    <div ref={rootRef} className="pointer-events-auto w-[15.5rem] shrink-0 snap-start rounded-2xl border-2 border-border bg-white p-3 shadow-[0_12px_32px_rgba(11,94,120,.10)]">
      <p className="m-0 mb-2 font-heading text-[13px] font-bold text-ink">{t.nowTitle}</p>
      {beaches[0] && (
        <Link
          href={`/${locale}/beaches/${beaches[0].slug}`}
          onClick={() => window.plausible?.("now_panel_click", { props: { target: "beach" } })}
          className="flex items-center gap-2 rounded-xl border border-border p-2 no-underline"
        >
          <span aria-hidden>🏖️</span>
          <span className="min-w-0 flex-1">
            <b className="block truncate font-heading text-[13px] text-ink">{beaches[0].name}</b>
            <span className="text-[11px] text-text-muted">
              {t.beachNow} · {beaches[0].km < 10 ? beaches[0].km.toFixed(1) : Math.round(beaches[0].km)} {t.km}
            </span>
          </span>
          <span className="rounded-full bg-sea-faint px-2 py-0.5 font-heading text-[11px] font-bold text-sea">{beaches[0].score}</span>
        </Link>
      )}
      {beaches.slice(1).map((b) => (
        <Link
          key={b.slug}
          href={`/${locale}/beaches/${b.slug}`}
          onClick={() => window.plausible?.("now_panel_click", { props: { target: "beach" } })}
          className="mt-1 flex items-center gap-2 rounded-xl px-2 py-1 no-underline"
        >
          <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{b.name}</span>
          <span className="shrink-0 text-[11px] text-text-muted">
            {b.km < 10 ? b.km.toFixed(1) : Math.round(b.km)} {t.km}
          </span>
          <span className="shrink-0 rounded-full bg-sea-faint px-1.5 py-0.5 font-heading text-[10px] font-bold text-sea">{b.score}</span>
        </Link>
      ))}
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
