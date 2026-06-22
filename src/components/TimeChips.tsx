"use client";

// Grille d'horaires en chips avec etats live (heure Athens, calcule client) :
// heures passees estompees, prochain depart en chip lagon pleine.
// Reference visuelle : docs/design/kalimera/bus.html bloc .tchip
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { timesForDate } from "@/lib/bus-journey";
import { athensNow, toMin } from "@/lib/athens-time";
import type { BusRoute } from "@/lib/buses";

export function TimeChips({ route }: { route: BusRoute; locale: string }) {
  const t = useTranslations("timeChips");
  const [live, setLive] = useState<{ today: Set<string>; next: string | null; minutes: number | null }>({
    today: new Set(), next: null, minutes: null,
  });

  useEffect(() => {
    const { iso, minutes } = athensNow();
    const times = timesForDate(route, iso).sort((a, b) => toMin(a) - toMin(b));
    const next = times.find((t) => toMin(t) >= minutes) ?? null;
    setLive({ today: new Set(times), next, minutes });
  }, [route]);

  const groups = route.departures_by_day && route.departures_by_day.length > 0
    ? route.departures_by_day
    : route.departures && route.departures.length > 0
      ? [{ days: "", times: route.departures }]
      : [];

  if (groups.length === 0) return null;

  const { today, next, minutes: nowMin } = live;

  return (
    <div>
      {groups.map((g, gi) => (
        <div key={gi} className="mb-2.5">
          {g.days && (
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted mt-3.5 mb-2">{g.days}</p>
          )}
          <ul className="flex flex-wrap gap-2 list-none p-0 m-0 font-data">
            {g.times.map((time, i) => {
              const isToday = today.has(time);
              const isNext = isToday && time === next;
              const isPast = isToday && !isNext && nowMin !== null && toMin(time) < nowMin;
              return (
                <li
                  key={`${time}-${i}`}
                  className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold border-[1.5px] ${
                    isNext
                      ? "bg-lagoon border-lagoon text-night"
                      : `bg-surface border-lagoon/35 text-text ${isPast ? "opacity-40" : ""}`
                  }`}
                >
                  {time}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="text-xs text-text-muted mt-3.5 mb-0">
        <span className="inline-block w-2.5 h-2.5 rounded bg-lagoon mr-1.5 align-[-1px]" />
        {t("legend")}
      </p>
    </div>
  );
}
