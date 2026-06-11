"use client";

// "Prochain depart HH:MM (dans X min)" en TZ Europe/Athens, calcule client
// depuis les memes donnees que les grilles affichees (timesForDate, lib pure).
// Pas de depart restant -> "Premier bus demain HH:MM". Pas de donnees -> null.
// Spec : docs/superpowers/specs/2026-06-11-ui-live-data-redesign-design.md
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { timesForDate } from "@/lib/bus-journey";
import type { BusRoute } from "@/lib/buses";

const T = {
  next: { en: "Next departure", fr: "Prochain départ", de: "Nächste Abfahrt", el: "Επόμενη αναχώρηση" },
  inMin: {
    en: (m: number) => `in ${m} min`, fr: (m: number) => `dans ${m} min`,
    de: (m: number) => `in ${m} Min`, el: (m: number) => `σε ${m} λεπτά`,
  },
  tomorrow: { en: "First bus tomorrow", fr: "Premier bus demain", de: "Erster Bus morgen", el: "Πρώτο λεωφορείο αύριο" },
} as const;
type Ui = keyof typeof T.next;

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

export function NextDeparture({ route, locale }: { route: BusRoute; locale: string }) {
  const ui = (["en", "fr", "de", "el"].includes(locale) ? locale : "en") as Ui;
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
    <span className="inline-flex items-center gap-1.5 rounded-md bg-aegean text-white font-data text-xs px-2 py-1">
      <Clock className="w-3 h-3" />
      {"time" in state
        ? `${T.next[ui]} ${state.time} · ${T.inMin[ui](state.inMin)}`
        : `${T.tomorrow[ui]} ${state.tomorrow}`}
    </span>
  );
}
