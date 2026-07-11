// src/lib/boarding-proxy.ts : logique pure du proxy embarquement bus
// (event Plausible bus_boarding_proxy). Fenêtre de départ, bucketing à
// cardinalité bornée, label proximité arrêt. Tests : scripts/check-boarding.mjs.
// Spec : docs/superpowers/specs/2026-07-11-flux-impact-instrumentation-design.md
export const BOARDING_WINDOW_MIN = -5;
export const BOARDING_WINDOW_MAX = 15;
export const NEAR_STOP_KM = 0.3;

export function inBoardingWindow(inMin: number): boolean {
  return Number.isFinite(inMin) && inMin >= BOARDING_WINDOW_MIN && inMin <= BOARDING_WINDOW_MAX;
}

export function bucketInMin(inMin: number): "due" | "0-5" | "6-15" {
  if (inMin < 0) return "due";
  return inMin <= 5 ? "0-5" : "6-15";
}

export function nearStopLabel(km: number | null): "yes" | "no" | "unknown" {
  if (km == null || !Number.isFinite(km)) return "unknown";
  return km <= NEAR_STOP_KM ? "yes" : "no";
}
