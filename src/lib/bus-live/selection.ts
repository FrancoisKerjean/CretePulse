// Dérivation présentation du bottom sheet (pur). `nowMinutes` injecté → testable.
import type { LiveBus } from "./types";
import { clockHHMM } from "../athens-time.ts";

export interface BusSheetVM {
  code: string;
  operatorLabel: string;
  origin: string;
  destination: string;
  nextStop: { name: string; etaMin: number; clock: string } | null;
  terminus: { etaMin: number; clock: string; estimated: boolean } | null;
  progressPct: number;
  lineHref: string | null;
}

const OPERATOR: Record<string, Record<string, string>> = {
  herlas: { en: "KTEL East", fr: "KTEL Est", de: "KTEL Ost", el: "ΚΤΕΛ Ανατολής" },
  ektel: { en: "KTEL West", fr: "KTEL Ouest", de: "KTEL West", el: "ΚΤΕΛ Δυτικής" },
};

function operatorLabel(operatorId: string, locale: string): string {
  const row = OPERATOR[operatorId];
  if (!row) return operatorId;
  return row[locale] ?? row.en;
}

export function deriveBusSheet(bus: LiveBus, nowMinutes: number, locale: string): BusSheetVM {
  const nextStop =
    bus.nextStop != null && bus.etaMinNext != null
      ? { name: bus.nextStop, etaMin: bus.etaMinNext, clock: clockHHMM(nowMinutes + bus.etaMinNext) }
      : null;
  const terminus =
    bus.etaMinTerminus != null && bus.etaMinTerminus > 0
      ? { etaMin: bus.etaMinTerminus, clock: clockHHMM(nowMinutes + bus.etaMinTerminus), estimated: bus.durationEstimated }
      : null;
  return {
    code: bus.codeOfficial ?? bus.code,
    operatorLabel: operatorLabel(bus.operatorId, locale),
    origin: bus.origin,
    destination: bus.headsign,
    nextStop,
    terminus,
    progressPct: Math.round(bus.progress * 100),
    lineHref: bus.pairSlug ? `/buses/${bus.pairSlug}` : null,
  };
}
