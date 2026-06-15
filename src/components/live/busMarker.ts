import type { LiveBus } from "@/lib/bus-live";

/** Crée l'élément DOM d'un marqueur bus (flèche orientée + halo cd-pulse). */
export function createBusEl(bus: LiveBus): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "position:relative;width:26px;height:26px;will-change:transform";
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
