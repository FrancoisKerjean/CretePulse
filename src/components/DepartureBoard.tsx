"use client";

// Board Solari des prochains departs DEPUIS le lieu actif (modele gare routiere).
// Countdown TZ Athens recalcule chaque minute. Style B1 : fond night, heures sun,
// destinations capitales, badge terracotta si depart < 15 min. Donnees via lib pure
// bus-departures (deja testee). Spec 2026-06-12-buses-redesign-board-design.md
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { athensNow } from "@/lib/athens-time";
import { departuresFrom, originPlaces, type DepartureRow } from "@/lib/bus-departures";
import { nearestBy } from "@/lib/geo";
import { slugifyPlace } from "@/lib/bus-pairs";
import { SLUG_COORDS } from "@/lib/taxi-fare";
import { useGeoPosition } from "@/components/geo/useGeoPosition";
import { useTranslations } from "next-intl";
import type { BusRoute } from "@/lib/buses";

const HUBS = ["Heraklion", "Chania", "Rethymno", "Agios Nikolaos", "Ierapetra", "Siteia"];
const SOON_MIN = 15;
const PAGE = 8;

function fmtIn(m: number, prefix: string, min: string, hr: string): string {
  if (m < 60) return `${prefix} ${m} ${min}`;
  const h = Math.floor(m / 60), r = m % 60;
  return `${prefix} ${h} ${hr}${r ? ` ${String(r).padStart(2, "0")}` : ""}`;
}

export function DepartureBoard({
  routes, activePlace, onPlaceChange, dateISO, isToday,
}: {
  routes: BusRoute[];
  locale: string;
  activePlace: string;
  onPlaceChange: (p: string) => void;
  dateISO: string;       // jour affiche (today par defaut)
  isToday: boolean;      // false => pas de countdown
}) {
  const t = useTranslations("departureBoard");
  const [rows, setRows] = useState<DepartureRow[]>([]);
  const [limit, setLimit] = useState(PAGE);
  const geo = useGeoPosition();

  const places = useMemo(() => originPlaces(routes), [routes]);

  // Recalcul a chaque minute (jour courant) ou une fois (jour futur).
  useEffect(() => {
    function recompute() {
      if (isToday) {
        const { iso, minutes } = athensNow();
        const tomorrowISO = new Date(new Date(`${iso}T12:00:00`).getTime() + 86400000)
          .toISOString().slice(0, 10);
        setRows(departuresFrom(routes, activePlace, iso, minutes, { tomorrowISO }));
      } else {
        setRows(departuresFrom(routes, activePlace, dateISO, null));
      }
    }
    recompute();
    if (!isToday) return;
    const id = setInterval(recompute, 60_000);
    return () => clearInterval(id);
  }, [routes, activePlace, dateISO, isToday]);

  // "Near me" : lieu de depart le plus proche parmi ceux ayant des coords.
  function handleNearMe() {
    if (!geo.pos) { geo.requestGeo(); return; }
    const withCoords = places
      .map((name) => { const s = slugifyPlace(name); const c = s ? SLUG_COORDS[s] : undefined;
        return c ? { name, lat: c[0], lon: c[1] } : null; })
      .filter(Boolean) as Array<{ name: string; lat: number; lon: number }>;
    const nearest = nearestBy(withCoords, (p) => [p.lat, p.lon], geo.pos, 1)[0];
    if (nearest) onPlaceChange(nearest.name);
  }
  useEffect(() => {
    if (geo.status === "granted" && geo.pos) handleNearMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status]);

  const pills = [...new Set([...HUBS, activePlace])].filter((p) => places.includes(p));
  const visible = rows.slice(0, limit);

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="font-heading font-bold text-lg text-text">{t("departures")} · {activePlace}</h2>
        {isToday && <span className="text-[10px] font-bold bg-ok/15 text-[#0E7C3A] rounded px-1.5 py-0.5">LIVE</span>}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <button type="button" onClick={handleNearMe}
          className="rounded-full px-3 py-1.5 text-xs font-semibold border-[1.5px] border-lagoon text-lagoon-deep bg-white">
          📍 {t("nearMe")}
        </button>
        {pills.map((p) => (
          <button key={p} type="button" onClick={() => onPlaceChange(p)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border-[1.5px] ${
              p === activePlace ? "bg-night text-white border-night" : "bg-white text-text border-border"}`}>
            {p}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl bg-night/5 p-5 text-sm text-text-muted">{t("none")}</div>
      ) : (
        <div className="rounded-[22px] bg-night text-white overflow-hidden">
          {visible.map((d) => {
            const soon = d.minutesUntil != null && d.minutesUntil < SOON_MIN;
            const inner = (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 last:border-0">
                <span className="font-heading font-extrabold text-sun text-base w-[52px] tabular-nums">{d.time}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-[13px] uppercase tracking-wide truncate">{d.toPlace}</span>
                  {d.durationLabel && <span className="block text-[10px] text-sky/80">{d.durationLabel}</span>}
                </span>
                {d.isTomorrow ? (
                  <span className="text-[10px] font-extrabold rounded px-2 py-1 bg-sun text-night">{t("tomorrow")}</span>
                ) : d.minutesUntil != null ? (
                  <span className={`text-[10px] font-extrabold rounded px-2 py-1 ${soon ? "bg-terracotta text-white" : "bg-sun text-night"}`}>
                    {fmtIn(d.minutesUntil, t("in"), t("min"), t("hr"))}
                  </span>
                ) : null}
                <span className="text-[11px] text-sky/80 w-[52px] text-right tabular-nums">
                  {d.priceEur != null ? `${d.priceEur.toFixed(2)}` : ""}
                </span>
              </div>
            );
            return d.pairSlug
              ? <Link key={d.routeId} href={`/buses/${d.pairSlug}`} className="block hover:bg-white/5">{inner}</Link>
              : <div key={d.routeId}>{inner}</div>;
          })}
        </div>
      )}

      {rows.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + PAGE)}
          className="mt-2 text-xs text-sea font-semibold hover:underline">
          {t("later")}
        </button>
      )}
    </section>
  );
}
