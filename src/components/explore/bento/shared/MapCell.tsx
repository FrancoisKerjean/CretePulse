import { projectCreteLatLng } from "@/lib/crete-geo";

const CRETE_PATH =
  "M30 110 Q70 80 120 95 Q170 100 210 85 Q260 70 310 95 Q360 110 380 100 L390 130 Q360 145 310 135 Q260 130 210 145 Q170 150 120 140 Q70 145 30 130 Z";

export function MapCell({
  lat, lng, label, className = "",
}: {
  lat: number | null;
  lng: number | null;
  label?: string | null;
  className?: string;
}) {
  const pin = lat != null && lng != null ? projectCreteLatLng(lat, lng) : null;
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-aegean-faint to-stone ${className}`}>
      <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d={CRETE_PATH} fill="#F2E7CE" stroke="#7C9A53" strokeWidth="1.5" opacity="0.85" />
      </svg>
      {pin && (
        <span
          className="absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-full rounded-full border-2 border-white bg-terra shadow-md"
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
        />
      )}
      {label && (
        <span className="absolute bottom-2 left-3 z-10 rounded-md bg-white/95 px-2 py-1 text-[10px] font-semibold text-aegean">
          {label}
        </span>
      )}
    </div>
  );
}
