"use client";

// Bloc vivant du hub /beaches : vent dominant sur l'île + meilleures plages
// du moment par région. Le hub reste en ISR 24 h, le live vient de
// /api/swim-now (cache CDN 30 min). Météo indisponible = le bloc disparaît.
// Spec : docs/SPEC-BEACHES-DATA.md (lot 3)
import { useEffect, useState } from "react";
import { Wind } from "lucide-react";
import Link from "next/link";

interface LiveBeach {
  slug: string;
  name: string;
  score: number;
  rating: "calm" | "fair" | "exposed";
}

interface SwimNow {
  wind: { cardinal: string; minSpeed: number; maxSpeed: number };
  regions: Array<{ region: string; beaches: LiveBeach[] }>;
}

const LABELS: Record<string, {
  title: string;
  wind: (c: string, min: number, max: number) => string;
  rating: Record<LiveBeach["rating"], string>;
  region: Record<string, string>;
  updated: string;
}> = {
  en: {
    title: "Best water right now, by area",
    wind: (c, min, max) => `Island wind: ${c}, ${min}–${max} km/h`,
    rating: { calm: "calm", fair: "fair", exposed: "exposed" },
    region: { west: "West", central: "Central", east: "East", south: "South" },
    updated: "Updated every 30 min",
  },
  fr: {
    title: "Meilleure eau en ce moment, par zone",
    wind: (c, min, max) => `Vent sur l'île : ${c}, ${min}–${max} km/h`,
    rating: { calm: "calme", fair: "correct", exposed: "exposée" },
    region: { west: "Ouest", central: "Centre", east: "Est", south: "Sud" },
    updated: "Actualisé toutes les 30 min",
  },
  de: {
    title: "Bestes Wasser gerade jetzt, nach Gebiet",
    wind: (c, min, max) => `Wind über der Insel: ${c}, ${min}–${max} km/h`,
    rating: { calm: "ruhig", fair: "passabel", exposed: "exponiert" },
    region: { west: "West", central: "Mitte", east: "Ost", south: "Süd" },
    updated: "Alle 30 Min. aktualisiert",
  },
  el: {
    title: "Καλύτερα νερά αυτή τη στιγμή, ανά περιοχή",
    wind: (c, min, max) => `Άνεμος στο νησί: ${c}, ${min}–${max} km/h`,
    rating: { calm: "ήρεμη", fair: "μέτρια", exposed: "εκτεθειμένη" },
    region: { west: "Δυτικά", central: "Κεντρικά", east: "Ανατολικά", south: "Νότια" },
    updated: "Ενημέρωση κάθε 30 λεπτά",
  },
};

const RATING_STYLES: Record<LiveBeach["rating"], string> = {
  calm: "bg-emerald-50 text-emerald-800",
  fair: "bg-amber-50 text-amber-800",
  exposed: "bg-red-50 text-red-800",
};

export function BeachesLiveNow({ locale }: { locale: string }) {
  const [data, setData] = useState<SwimNow | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/swim-now?locale=${locale}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [locale]);

  if (failed) return null;
  const L = LABELS[locale] ?? LABELS.en;

  return (
    <section className="mt-4 rounded-xl border border-border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-base font-bold text-sea">{L.title}</h2>
        <span className="text-[10px] text-text-light">{L.updated}</span>
      </div>
      {!data ? (
        <div className="h-20 rounded-lg bg-surface animate-pulse" />
      ) : (
        <>
          <p className="flex items-center gap-2 text-sm text-text-muted mb-3">
            <Wind className="w-4 h-4 text-sea" />
            {L.wind(data.wind.cardinal, data.wind.minSpeed, data.wind.maxSpeed)}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.regions.map((r) => (
              <div key={r.region}>
                <p className="text-xs font-semibold text-text-muted uppercase mb-1">
                  {L.region[r.region] ?? r.region}
                </p>
                <ul className="space-y-1">
                  {r.beaches.map((b) => (
                    <li key={b.slug} className="flex items-center justify-between gap-2">
                      <Link href={`/${locale}/beaches/${b.slug}`} className="text-sm text-sea hover:underline truncate">
                        {b.name}
                      </Link>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${RATING_STYLES[b.rating]}`}>
                        {L.rating[b.rating]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
