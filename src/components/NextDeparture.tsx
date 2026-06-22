"use client";

// "Prochain depart HH:MM (dans X min)" en TZ Europe/Athens, calcule client
// depuis les memes donnees que les grilles affichees (timesForDate, lib pure).
// Pas de depart restant -> "Premier bus demain HH:MM". Pas de donnees -> null.
// Spec : docs/superpowers/specs/2026-06-11-ui-live-data-redesign-design.md
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { timesForDate } from "@/lib/bus-journey";
import type { BusRoute } from "@/lib/buses";

function athensParts(d: Date): { iso: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    iso: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: parseInt(get("hour")) % 24 * 60 + parseInt(get("minute")),
  };
}

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function NextDeparture({ route }: { route: BusRoute; locale: string }) {
  const t = useTranslations("nextDeparture");
  const [state, setState] = useState<{ time: string; inMin: number } | { tomorrow: string } | null>(null);

  useEffect(() => {
    const now = new Date();
    const { iso, minutes } = athensParts(now);
    const next = timesForDate(route, iso)
      .map((t) => ({ t, m: toMin(t) }))
      .sort((a, b) => a.m - b.m)
      .find((x) => x.m >= minutes);
    if (next) {
      setState({ time: next.t, inMin: next.m - minutes });
      return;
    }
    const { iso: tomorrowIso } = athensParts(new Date(now.getTime() + 86400000));
    const first = timesForDate(route, tomorrowIso).sort((a, b) => toMin(a) - toMin(b))[0];
    setState(first ? { tomorrow: first } : null);
  }, [route]);

  if (!state) return null;
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-night text-white font-data text-sm px-4 py-2">
      <Clock className="w-3.5 h-3.5" />
      {"time" in state ? (
        <>
          {t("next")} <b>{state.time}</b>
          <span className="text-[#43E89D] font-bold">· {t("inMin", { m: state.inMin })}</span>
        </>
      ) : (
        <>{t("tomorrow")} <b>{state.tomorrow}</b></>
      )}
    </span>
  );
}
