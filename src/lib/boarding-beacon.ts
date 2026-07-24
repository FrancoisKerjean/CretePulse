// src/lib/boarding-beacon.ts : émission dédupliquée de l'event Plausible
// bus_boarding_proxy (1× par surface+clé par session, pattern RetentionBeacon).
// L'event part TOUJOURS, near_stop="unknown" si la géoloc passive échoue.
import { nearStopLabel } from "./boarding-proxy";
import { passiveNearestStopKm } from "./passive-position";

export async function emitBoardingProxy(
  surface: "pair" | "live",
  key: string,
  props: Record<string, string>,
): Promise<void> {
  try {
    const guard = `cd_bp_${surface}_${key}`;
    if (sessionStorage.getItem(guard)) return;
    sessionStorage.setItem(guard, "1");
    const km = await passiveNearestStopKm();
    (window as unknown as {
      plausible?: (e: string, o?: { props?: Record<string, string> }) => void;
    }).plausible?.("bus_boarding_proxy", {
      props: { surface, ...props, near_stop: nearStopLabel(km) },
    });
  } catch {
    // sessionStorage indisponible : on ne mesure pas, on ne casse rien.
  }
}
