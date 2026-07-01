import type { LiveBus, LiveGpsBus } from "@/lib/bus-live";

/** Crée l'élément DOM d'un marqueur bus (flèche orientée + halo cd-pulse). */
export function createBusEl(bus: LiveBus): HTMLDivElement {
  const el = document.createElement("div");
  // position:absolute (pas relative) : sinon l'élément reste dans le flux DOM et
  // s'empile sous les précédents (décalage vertical cumulé visible au dézoom).
  el.style.cssText = "position:absolute;top:0;left:0;width:26px;height:26px;will-change:transform";
  const color = bus.degraded ? "#5C7886" : "#0B5E78";
  el.innerHTML =
    `<span style="position:absolute;inset:-8px;border-radius:50%;background:rgba(11,94,120,.16);animation:cd-pulse 2s ease-out infinite"></span>` +
    `<span class="bus-arrow" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;` +
    `width:26px;height:26px;border-radius:50%;background:${color};color:#fff;font:700 11px/1 var(--font-heading),sans-serif;` +
    `box-shadow:0 1px 4px rgba(0,0,0,.3);transform:rotate(${bus.bearing}deg)">▲</span>`;
  el.title = `${bus.codeOfficial ?? bus.code} → ${bus.headsign}`;
  return el;
}

/** Met à jour l'orientation de la flèche d'un élément existant. */
export function setBusArrow(el: HTMLElement, bearingDeg: number): void {
  const arrow = el.querySelector(".bus-arrow") as HTMLElement | null;
  if (arrow) arrow.style.transform = `rotate(${bearingDeg}deg)`;
}

/** Marqueur d'un bus à position GPS RÉELLE (Agios Nikolaos). Visuellement distinct de
 *  l'estimé : rond à la couleur de la ligne + anneau vert "live" + halo pulsé.
 *  Hypothèse: bus.color est un hex #RRGGBB (garanti par /api/buses/agncitybus-live,
 *  constantes LINE) -> `${color}2b` = #RRGGBB2b (RGBA 8 chiffres, halo ~17% alpha). */
export function createGpsBusEl(bus: LiveGpsBus): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "position:absolute;top:0;left:0;width:30px;height:30px;will-change:transform";
  el.innerHTML =
    `<span style="position:absolute;inset:-9px;border-radius:50%;background:${bus.color}2b;animation:cd-pulse 2s ease-out infinite"></span>` +
    `<span class="bus-arrow" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;` +
    `width:30px;height:30px;border-radius:50%;background:${bus.color};color:#fff;font:800 11px/1 var(--font-heading),sans-serif;` +
    `box-shadow:0 0 0 2.5px #12B76A,0 1px 5px rgba(0,0,0,.35);transform:rotate(${bus.bearing}deg)">▲</span>` +
    `<span style="position:absolute;right:-2px;top:-2px;width:9px;height:9px;border-radius:50%;background:#12B76A;` +
    `box-shadow:0 0 0 2px #fff"></span>`;
  el.title = `${bus.lineCode} · GPS live${bus.plate ? ` · ${bus.plate}` : ""}`;
  return el;
}
