// Point d'import unique de la couche moteur (consommé par la carte via @/lib/bus-live).
export { busesAt, orientRoute, elapsedToKm, kmToPoint, activeDepartures } from "./position";
export type { NowAthens, OrientedRoute, PointOnLine } from "./position";
export { loadLiveNetwork } from "./network";
export type { LiveBus, LiveGpsBus, LiveLine, LiveNetwork, LiveStop } from "./types";
export { lerp, lerpAngle, reconcile } from "./animate";
export type { MarkerPose, PresentBus } from "./animate";
