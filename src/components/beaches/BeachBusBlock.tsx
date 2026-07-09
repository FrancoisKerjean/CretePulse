// Bloc "y aller en bus" des pages plages (server component, rendu dans
// l'ISR 48 h : les arrêts et lignes ne bougent qu'au scrape hebdo).
// Trois niveaux, affichés seulement si la donnée existe : arrêt physique le
// plus proche, réseau urbain (Heraklion / Chania / Agios Nikolaos), pages
// horaires interurbaines /buses/[pair]. Rien dans le rayon = pas de bloc.
// Spec : docs/SPEC-BEACHES-DATA.md (lot 1)
import Link from "next/link";
import { Bus } from "lucide-react";
import { getBeachBusInfo, type UrbanCity } from "@/lib/beach-bus";
import { BUS_PLACE_SLUGS } from "@/lib/bus-pairs";

const URBAN_NAMES: Record<UrbanCity, string> = {
  heraklion: "Heraklion",
  chania: "Chania",
  "agios-nikolaos": "Agios Nikolaos",
};

const LABELS: Record<string, {
  title: string;
  nearestStop: (name: string, km: number) => string;
  urban: (city: string) => string;
  pair: (a: string, b: string) => string;
  crowFlies: string;
}> = {
  en: {
    title: "Getting there by bus",
    nearestStop: (name, km) => `Nearest bus stop: ${name} (${km} km)`,
    urban: (city) => `${city} city bus network: lines, stops and live map`,
    pair: (a, b) => `Bus ${a} – ${b}: timetables and prices`,
    crowFlies: "Distances as the crow flies.",
  },
  fr: {
    title: "Y aller en bus",
    nearestStop: (name, km) => `Arrêt le plus proche : ${name} (${km} km)`,
    urban: (city) => `Réseau urbain de ${city} : lignes, arrêts et carte live`,
    pair: (a, b) => `Bus ${a} – ${b} : horaires et prix`,
    crowFlies: "Distances à vol d'oiseau.",
  },
  de: {
    title: "Anfahrt mit dem Bus",
    nearestStop: (name, km) => `Nächste Haltestelle: ${name} (${km} km)`,
    urban: (city) => `Stadtbusnetz ${city}: Linien, Haltestellen und Live-Karte`,
    pair: (a, b) => `Bus ${a} – ${b}: Fahrpläne und Preise`,
    crowFlies: "Entfernungen in Luftlinie.",
  },
  el: {
    title: "Πρόσβαση με λεωφορείο",
    nearestStop: (name, km) => `Κοντινότερη στάση: ${name} (${km} χλμ)`,
    urban: (city) => `Αστικό δίκτυο ${city}: γραμμές, στάσεις και ζωντανός χάρτης`,
    pair: (a, b) => `Λεωφορείο ${a} – ${b}: δρομολόγια και τιμές`,
    crowFlies: "Αποστάσεις σε ευθεία γραμμή.",
  },
};

export async function BeachBusBlock({
  lat,
  lng,
  locale,
}: {
  lat: number;
  lng: number;
  locale: string;
}) {
  const info = await getBeachBusInfo(lat, lng);
  if (!info.stop && !info.destination) return null;
  const L = LABELS[locale] ?? LABELS.en;

  // Nom lisible d'un bout de paire : celui de la whitelist (orthographe DB
  // parfois translittérée : "Eloynta" → slug "elounda" → affiché tel quel).
  const displayName = (dbName: string) => {
    const slug = BUS_PLACE_SLUGS[dbName];
    if (!slug) return dbName;
    return slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  };

  return (
    <section className="mb-8 rounded-xl border border-border bg-white p-4">
      <h2 className="flex items-center gap-2 text-base font-bold text-sea mb-3">
        <Bus className="w-4 h-4" /> {L.title}
      </h2>
      <ul className="space-y-2 text-sm">
        {info.stop && (
          <li className="text-text">{L.nearestStop(info.stop.name, info.stop.km)}</li>
        )}
        {info.urban && (
          <li>
            <Link href={`/${locale}/buses/${info.urban.city}`} className="text-sea hover:underline">
              {L.urban(URBAN_NAMES[info.urban.city])} →
            </Link>
          </li>
        )}
        {info.pairs.map((p) => (
          <li key={p.slug}>
            <Link href={`/${locale}/buses/${p.slug}`} className="text-sea hover:underline">
              {L.pair(displayName(p.fromName), displayName(p.toName))} →
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-text-light mt-3">{L.crowFlies}</p>
    </section>
  );
}
