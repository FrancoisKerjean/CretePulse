import type { LiveBus } from "@/lib/bus-live";

const NORMAL = "#0B5E78";   // aegean
const SELECTED = "#ED7A5C"; // terra

/** Élément DOM d'un marqueur bus : hit-area 44px + inner 26px (flèche + halo). */
export function createBusEl(bus: LiveBus): HTMLDivElement {
  const el = document.createElement("div");
  // conteneur = zone tactile 44px transparente, centre l'inner
  el.style.cssText =
    "position:absolute;top:0;left:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;will-change:transform";
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  el.setAttribute("aria-label", `${bus.codeOfficial ?? bus.code} → ${bus.headsign}`);
  el.title = `${bus.codeOfficial ?? bus.code} → ${bus.headsign}`;

  // Affichage uniforme : les bus à tracé estimé (degraded) sont rendus comme les
  // autres (la page /live indique déjà « estimé d'après l'horaire »).
  const color = NORMAL;
  const inner = document.createElement("div");
  inner.className = "bus-inner";
  inner.style.cssText = "position:relative;width:26px;height:26px;transition:transform .15s ease";
  inner.innerHTML =
    `<span style="position:absolute;inset:-8px;border-radius:50%;background:rgba(11,94,120,.16);animation:cd-pulse 2s ease-out infinite"></span>` +
    `<span class="bus-arrow" data-base="${color}" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;` +
    `width:26px;height:26px;border-radius:50%;background:${color};color:#fff;font:700 11px/1 var(--font-heading),sans-serif;` +
    `box-shadow:0 1px 4px rgba(0,0,0,.3);transform:rotate(${bus.bearing}deg)">▲</span>`;
  el.appendChild(inner);
  return el;
}

/** Met à jour l'orientation de la flèche d'un élément existant. */
export function setBusArrow(el: HTMLElement, bearingDeg: number): void {
  const arrow = el.querySelector(".bus-arrow") as HTMLElement | null;
  if (arrow) arrow.style.transform = `rotate(${bearingDeg}deg)`;
}

/** Marque (ou démarque) le bus sélectionné : agrandi + couleur terra + au-dessus. */
export function setBusSelected(el: HTMLElement, on: boolean): void {
  const inner = el.querySelector(".bus-inner") as HTMLElement | null;
  const arrow = el.querySelector(".bus-arrow") as HTMLElement | null;
  if (inner) inner.style.transform = on ? "scale(1.35)" : "scale(1)";
  if (arrow) arrow.style.background = on ? SELECTED : (arrow.getAttribute("data-base") ?? NORMAL);
  el.style.zIndex = on ? "3" : "";
}

/** Estompe (ou rétablit) un marqueur non sélectionné. */
export function setBusDimmed(el: HTMLElement, on: boolean): void {
  el.style.opacity = on ? "0.35" : "1";
}
