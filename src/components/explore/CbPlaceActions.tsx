"use client";

// 3 CTAs partagees entre le drawer /explore et la fiche /explore/[slug] :
//   - Itineraire : Google Maps directions depuis la position courante
//   - Bus : deep-link /buses?to=<lieu KTEL le plus proche>
//   - Voir la fiche : /explore/[slug] (cache si on est deja sur la fiche)

import Link from "next/link";
import { MapPin, ArrowUpRight } from "lucide-react";
import { CiBus } from "@/components/icons";
import { nearestBusPlaceName } from "@/lib/cb-place-helpers";

const T: Record<string, { route: string; bus: string; sheet: string; busFallback: string }> = {
  en: { route: "Directions", bus: "Buses to here", sheet: "Open full page", busFallback: "Bus schedules" },
  fr: { route: "Itinéraire", bus: "Bus jusqu'ici", sheet: "Ouvrir la fiche", busFallback: "Horaires bus" },
  de: { route: "Route", bus: "Bus hierher", sheet: "Vollansicht", busFallback: "Busfahrpläne" },
  el: { route: "Διαδρομή", bus: "Λεωφορεία εδώ", sheet: "Πλήρης σελίδα", busFallback: "Δρομολόγια" },
};

export function CbPlaceActions({
  slug,
  name,
  latitude,
  longitude,
  locale,
  showSheetLink = true,
  compact = false,
}: {
  slug: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  locale: string;
  showSheetLink?: boolean;
  compact?: boolean;
}) {
  const t = T[locale] ?? T.en;
  const hasCoords = latitude != null && longitude != null;
  // Lien Google Maps "open in app / directions" - destination = lat,lng + nom
  // pour que l'app native nomme le pin correctement.
  const directionsHref = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=&travelmode=driving`
    : null;
  const busDest = hasCoords ? nearestBusPlaceName({ lat: latitude!, lon: longitude! }) : null;
  const busHref = busDest
    ? `/${locale}/buses?to=${encodeURIComponent(busDest)}`
    : `/${locale}/buses`;
  const busLabel = busDest ? `${t.bus} (${busDest})` : t.busFallback;

  const btnBase = compact
    ? "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors"
    : "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors";

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-1"}`}>
      {directionsHref && (
        <a
          href={directionsHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t.route} · ${name}`}
          className={`${btnBase} bg-sea text-white hover:bg-sea/90`}
        >
          <MapPin className="w-4 h-4" /> {t.route}
        </a>
      )}
      {hasCoords && (
        <Link
          href={busHref}
          aria-label={`${busLabel} · ${name}`}
          className={`${btnBase} bg-white text-sea border-[1.5px] border-sea/30 hover:border-sea/60`}
        >
          <CiBus className="w-4 h-4" /> {busLabel}
        </Link>
      )}
      {showSheetLink && (
        <Link
          href={`/${locale}/explore/${slug}`}
          className={`${btnBase} bg-sand text-text border border-border hover:bg-surface`}
        >
          <ArrowUpRight className="w-4 h-4" /> {t.sheet}
        </Link>
      )}
    </div>
  );
}
