// Interpolation et réconciliation pures pour l'animation des marqueurs bus.
// Zéro DOM, zéro I/O. Testé par scripts/check-bus-animate.mjs.
import type { LiveBus } from "./types";

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpole un cap (degrés) par le plus court arc. Sortie 0..360. */
export function lerpAngle(a: number, b: number, t: number): number {
  const d = ((b - a) % 360 + 540) % 360 - 180; // diff signée -180..180
  return ((a + d * t) % 360 + 360) % 360;
}

export interface MarkerPose { lat: number; lng: number; bearing: number; }
export interface PresentBus { id: string; from: MarkerPose; to: LiveBus; }

/** Compare l'état courant des marqueurs (par id) aux nouvelles positions. */
export function reconcile(
  prev: Map<string, MarkerPose>,
  next: LiveBus[],
): { entering: LiveBus[]; present: PresentBus[]; leaving: string[] } {
  const nextIds = new Set(next.map((b) => b.id));
  const entering: LiveBus[] = [];
  const present: PresentBus[] = [];
  for (const b of next) {
    const cur = prev.get(b.id);
    if (cur) present.push({ id: b.id, from: cur, to: b });
    else entering.push(b);
  }
  const leaving = [...prev.keys()].filter((id) => !nextIds.has(id));
  return { entering, present, leaving };
}
