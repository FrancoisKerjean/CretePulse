// Fleche orientee selon la direction du vent (meteo). windDir = direction
// D'OU vient le vent (convention meteo) -> la fleche pointe vers ou il VA.
import { Navigation } from "lucide-react";

export function WindArrow({ deg, className = "w-3.5 h-3.5" }: { deg: number; className?: string }) {
  return (
    <Navigation
      className={className}
      style={{ transform: `rotate(${(deg + 180) % 360}deg)` }}
      aria-label={`wind ${Math.round(deg)}°`}
    />
  );
}
