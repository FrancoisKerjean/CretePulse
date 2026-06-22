"use client";

// Petite île client de /beaches/today : "la plage calme la plus proche".
// Géolocalisation 100 % navigateur (useGeoPosition), tri nearestBy sur le
// payload réduit passé par la page (swim.scored filtré rating !== "exposed").
// Spec : docs/superpowers/specs/2026-06-12-near-me-design.md
import { useMemo } from "react";
import Link from "next/link";
import { isOnCrete, nearestBy } from "@/lib/geo";
import { useGeoPosition } from "@/components/geo/useGeoPosition";
import { CardThumb } from "@/components/CardThumb";
import { CiCompass } from "@/components/icons";

export interface NearestSwimBeach {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  score: number;
  rating: "calm" | "fair";
  imageUrl: string | null;
}

type Strings = {
  find: string;
  locating: string;
  trust: string;
  denied: string;
  unavailable: string;
  notInCrete: string;
  kmAway: (km: string) => string;
  beachGuide: string;
  rating: Record<"calm" | "fair", string>;
};

const T: Record<string, Strings> = {
  en: {
    find: "Find the calm beach nearest to you",
    locating: "Locating…",
    trust: "Your location never leaves your browser.",
    denied: "Location request was declined.",
    unavailable: "Location is not available on this device.",
    notInCrete: "You're not in Crete yet · this works once you're on the island.",
    kmAway: (km) => `${km} km away`,
    beachGuide: "Beach guide",
    rating: { calm: "calm", fair: "fair" },
  },
  fr: {
    find: "Trouver la plage calme la plus proche de vous",
    locating: "Localisation…",
    trust: "Votre position ne quitte jamais votre navigateur.",
    denied: "Localisation refusée.",
    unavailable: "Localisation indisponible sur cet appareil.",
    notInCrete: "Vous n'êtes pas encore en Crète · cela fonctionne une fois sur l'île.",
    kmAway: (km) => `à ${km} km`,
    beachGuide: "Guide de la plage",
    rating: { calm: "calme", fair: "correct" },
  },
  de: {
    find: "Den ruhigen Strand in Ihrer Nähe finden",
    locating: "Standort wird ermittelt…",
    trust: "Ihr Standort verlässt nie Ihren Browser.",
    denied: "Standortfreigabe abgelehnt.",
    unavailable: "Standort auf diesem Gerät nicht verfügbar.",
    notInCrete: "Noch nicht auf Kreta · das funktioniert, sobald Sie auf der Insel sind.",
    kmAway: (km) => `${km} km entfernt`,
    beachGuide: "Strandguide",
    rating: { calm: "ruhig", fair: "machbar" },
  },
  el: {
    find: "Βρείτε την ήρεμη παραλία πιο κοντά σας",
    locating: "Εντοπισμός…",
    trust: "Η τοποθεσία σας δεν φεύγει ποτέ από το πρόγραμμα περιήγησης.",
    denied: "Ο εντοπισμός απορρίφθηκε.",
    unavailable: "Ο εντοπισμός δεν είναι διαθέσιμος σε αυτήν τη συσκευή.",
    notInCrete: "Δεν είστε ακόμα στην Κρήτη · λειτουργεί μόλις βρεθείτε στο νησί.",
    kmAway: (km) => `${km} χλμ μακριά`,
    beachGuide: "Οδηγός παραλίας",
    rating: { calm: "ήρεμη", fair: "βατή" },
  },
};

const RATING_CLASS: Record<"calm" | "fair", string> = {
  calm: "bg-[rgba(20,184,107,.13)] text-[#0B8A52]",
  fair: "bg-sun/20 text-[#8A6A14]",
};

/** "X.X" sous 10 km, entier au-delà. */
function fmtKm(km: number): string {
  return km < 10 ? km.toFixed(1) : String(Math.round(km));
}

export function NearestSwimSpot({
  locale,
  beaches,
}: {
  locale: string;
  beaches: NearestSwimBeach[];
}) {
  const t = T[locale] || T.en;
  const { status, pos, requestGeo } = useGeoPosition();

  const nearest = useMemo(() => {
    if (!pos || !isOnCrete(pos)) return null;
    return nearestBy(beaches, (b) => [b.latitude, b.longitude], pos, 1)[0] ?? null;
  }, [pos, beaches]);

  // Position connue + sur l'île : carte de la plage la plus proche.
  if (nearest) {
    return (
      <section className="mb-10">
        <Link
          href={`/${locale}/beaches/${nearest.slug}`}
          className="card-base overflow-hidden block no-underline sm:grid sm:grid-cols-[280px_1fr]"
        >
          <CardThumb src={nearest.imageUrl} alt={nearest.name} />
          <div className="p-5 flex flex-col justify-center gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="font-heading font-bold text-[19px] text-text m-0">{nearest.name}</p>
              <span className={`rounded-full px-3 py-1 text-[11.5px] font-extrabold font-data ${RATING_CLASS[nearest.rating]}`}>
                ≈ {t.rating[nearest.rating]}
              </span>
            </div>
            <p className="text-sm text-text-muted m-0 font-data">
              {t.kmAway(fmtKm(nearest.km))}
            </p>
            <span className="text-sm font-bold text-lagoon-deep">{t.beachGuide}</span>
          </div>
        </Link>
      </section>
    );
  }

  return (
    <section className="mb-10 rounded-[28px] bg-white px-7 py-5 shadow-[0_12px_32px_rgba(11,94,120,.10)] flex flex-wrap items-center gap-x-4 gap-y-2">
      {status === "prompting" ? (
        <p className="inline-flex items-center gap-2.5 text-sm text-text font-heading font-bold m-0">
          <span className="w-4 h-4 rounded-full border-2 border-sea border-t-transparent animate-spin" aria-hidden />
          {t.locating}
        </p>
      ) : (
        <button
          onClick={requestGeo}
          className="inline-flex items-center gap-2 text-sm font-heading font-bold text-sea hover:underline"
        >
          <CiCompass className="w-5 h-5 shrink-0" /> {t.find}
        </button>
      )}
      {status === "denied" && <span className="text-xs text-[#B84B30]">{t.denied}</span>}
      {status === "unavailable" && <span className="text-xs text-[#B84B30]">{t.unavailable}</span>}
      {pos && !isOnCrete(pos) && <span className="text-xs text-text-muted">{t.notInCrete}</span>}
      <span className="text-xs text-text-light ml-auto">{t.trust}</span>
    </section>
  );
}
