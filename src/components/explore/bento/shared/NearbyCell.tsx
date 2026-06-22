import type { NearbyPlace } from "@/lib/cb-place-helpers";
import { nearbyCountLabel } from "@/lib/bento-labels";

export function NearbyCell({
  nearby, locale, className = "",
}: {
  nearby: NearbyPlace[];
  locale: string;
  className?: string;
}) {
  if (nearby.length === 0) return null;
  const names = nearby.slice(0, 3).map((n) => n.name).join(", ");
  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-br from-stone to-sea-faint p-3 ${className}`}>
      <div
        className="h-16 w-16 flex-shrink-0 rounded-xl bg-sea-faint"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 35%, #0B5E78 0 3px, transparent 4px), radial-gradient(circle at 60% 55%, #0B5E78 0 3px, transparent 4px), radial-gradient(circle at 50% 50%, #ED7A5C 0 4px, transparent 5px)",
        }}
      />
      <p className="font-heading text-sm font-bold leading-tight text-sea">
        {nearbyCountLabel(nearby.length, locale)}
        <span className="mt-1 block text-[11px] font-normal text-text-muted">{names}</span>
      </p>
    </div>
  );
}
