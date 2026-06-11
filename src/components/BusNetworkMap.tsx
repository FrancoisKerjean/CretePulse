"use client";

// BusNetworkMap - plan du réseau KTEL Crète style Harry Beck (Paris metro).
// Interactif : props fromPlace/toPlace highlightent 2 stations + lignes qui
// les relient, grisent le reste. Toujours indexable Google (SVG inline).
// Note redesign 11/06 : conservé face à MapLibre (canvas = invisible Google,
// perte du highlight). Replié par défaut en mobile (SVG reste dans le DOM).
import { useEffect, useState } from "react";
//
// Stratégie layout :
//   - La côte nord de la Crète est quasi-rectiligne → on aligne toutes les villes
//     du nord sur une horizontale (la "Ligne Nord") façon métro.
//   - 2 lignes principales par opérateur KTEL :
//       Aegean ouest (ektel) : Kissamos - Chania - Rethymno - Heraklion
//       Terra est  (herlas) : Heraklion - Hersonissos - Malia - Agios Nikolaos - Sitia
//   - Branches : Elafonissi (sud-ouest), Matala (sud), Ierapetra (sud-est),
//     Heraklion/Chania Airports.
//
// Pas de positions lat/lng réelles : les vrais plans Beck déforment la
// géographie pour la lisibilité. Coords manuelles en viewBox 1200×420.

type Loc = "en" | "fr" | "de" | "el";

type Station = {
  id: string;
  /** Label par locale ; fallback en. */
  label: Partial<Record<Loc, string>>;
  /** Position viewBox 1200×420. */
  x: number;
  y: number;
  /** "town" | "airport" | "beach" | "site" | "village" */
  kind?: "town" | "airport" | "beach" | "site" | "village";
  /** Anchor label : "above" (default) / "below" / "right" / "left" */
  anchor?: "above" | "below" | "right" | "left";
  /** Si destination = ancre interne sur /buses (slug bus_destinations). */
  destSlug?: string;
};

type Line = {
  id: string;
  /** Suite d'ids de stations (ordre = tracé). */
  stops: string[];
  color: "terra" | "aegean" | "olive";
  /** Label opérateur. */
  operatorLabel: Partial<Record<Loc, string>>;
  /** Tracé en pointillé (route saisonnière, etc.). */
  dashed?: boolean;
};

const STATIONS: Station[] = [
  // ============ NORD (ligne principale ouest → est) ============
  { id: "falassarna",label: { en: "Falassarna" },                                 x: 40,   y: 110, kind: "beach", anchor: "above" },
  { id: "balos",     label: { en: "Balos" },                                      x: 60,   y: 50,  kind: "beach", anchor: "above", destSlug: "balos" },
  { id: "kissamos",  label: { en: "Kissamos" },                                   x: 100,  y: 200, kind: "town" },
  { id: "chania_apt",label: { en: "Chania Apt", fr: "Aéroport La Canée" },        x: 230,  y: 110, kind: "airport", anchor: "above" },
  { id: "chania",    label: { en: "Chania", fr: "La Canée" },                     x: 250,  y: 200, kind: "town", destSlug: "chania" },
  { id: "souda",     label: { en: "Souda", fr: "Souda (port)" },                  x: 320,  y: 110, kind: "town", anchor: "above" },
  { id: "rethymno",  label: { en: "Rethymno", fr: "Rethymnon" },                  x: 470,  y: 200, kind: "town", destSlug: "rethymno" },
  { id: "anogeia",   label: { en: "Anogeia" },                                    x: 560,  y: 120, kind: "village", anchor: "above" },
  { id: "heraklion", label: { en: "Heraklion", fr: "Héraklion" },                 x: 680,  y: 200, kind: "town", destSlug: "heraklion" },
  { id: "her_apt",   label: { en: "Heraklion Apt", fr: "Aéroport Héraklion" },    x: 720,  y: 110, kind: "airport", anchor: "above" },
  { id: "hersonissos",label:{ en: "Hersonissos" },                                x: 790,  y: 200, kind: "town", destSlug: "hersonissos" },
  { id: "malia",     label: { en: "Malia" },                                      x: 860,  y: 200, kind: "town", destSlug: "malia" },
  { id: "agios",     label: { en: "Agios Nikolaos" },                             x: 970,  y: 200, kind: "town", destSlug: "agios-nikolaos" },
  { id: "elounda",   label: { en: "Elounda" },                                    x: 990,  y: 110, kind: "town", anchor: "above" },
  { id: "sitia",     label: { en: "Sitia" },                                      x: 1110, y: 200, kind: "town", destSlug: "sitia" },
  { id: "vai",       label: { en: "Vai" },                                        x: 1160, y: 110, kind: "beach", anchor: "above" },

  // ============ SUD ============
  { id: "paleochora",label: { en: "Paleochora", fr: "Paléochora" },               x: 180,  y: 360, kind: "town", anchor: "below" },
  { id: "sougia",    label: { en: "Sougia" },                                     x: 250,  y: 380, kind: "village", anchor: "below" },
  { id: "elafonissi",label: { en: "Elafonissi" },                                 x: 100,  y: 360, kind: "beach", anchor: "below", destSlug: "elafonissi" },
  { id: "omalos",    label: { en: "Omalos / Samaria" },                           x: 310,  y: 320, kind: "site", anchor: "below" },
  { id: "sfakion",   label: { en: "Hora Sfakion", fr: "Sfakia" },                 x: 380,  y: 380, kind: "town", anchor: "below" },
  { id: "plakias",   label: { en: "Plakias" },                                    x: 470,  y: 360, kind: "beach", anchor: "below" },
  { id: "matala",    label: { en: "Matala" },                                     x: 620,  y: 360, kind: "beach", anchor: "below", destSlug: "matala" },
  { id: "knossos",   label: { en: "Knossos" },                                    x: 680,  y: 280, kind: "site", anchor: "below", destSlug: "knossos" },
  { id: "ierapetra", label: { en: "Ierapetra" },                                  x: 920,  y: 360, kind: "town", anchor: "below", destSlug: "ierapetra" },
  { id: "makrigialos",label:{ en: "Makrigialos" },                                x: 1010, y: 360, kind: "town", anchor: "below" },
];

const LINES: Line[] = [
  // ============ OUEST ektel (aegean) ============
  {
    id: "west_main",
    color: "aegean",
    operatorLabel: {
      en: "KTEL Chania-Rethymno (West)",
      fr: "KTEL La Canée-Rethymnon (Ouest)",
      de: "KTEL Chania-Rethymno (West)",
      el: "ΚΤΕΛ Χανίων-Ρεθύμνου (Δυτικά)",
    },
    stops: ["kissamos", "chania", "rethymno", "heraklion"],
  },
  {
    id: "west_chania_apt",
    color: "aegean",
    operatorLabel: { en: "Chania Airport branch" },
    stops: ["chania", "chania_apt"],
  },
  {
    id: "west_souda",
    color: "aegean",
    operatorLabel: { en: "Souda ferry port (Athens)" },
    stops: ["chania", "souda"],
  },
  {
    id: "west_falassarna",
    color: "aegean",
    operatorLabel: { en: "Falassarna beach (summer only)" },
    stops: ["kissamos", "falassarna"],
    dashed: true,
  },
  {
    id: "west_balos",
    color: "aegean",
    operatorLabel: { en: "Balos / Gramvousa (summer only)" },
    stops: ["kissamos", "balos"],
    dashed: true,
  },
  {
    id: "west_paleochora",
    color: "aegean",
    operatorLabel: { en: "Paleochora (south-west)" },
    stops: ["chania", "paleochora"],
  },
  {
    id: "west_sougia",
    color: "aegean",
    operatorLabel: { en: "Sougia (south)" },
    stops: ["chania", "sougia"],
  },
  {
    id: "west_omalos",
    color: "aegean",
    operatorLabel: { en: "Omalos / Samaria Gorge (summer only)" },
    stops: ["chania", "omalos"],
    dashed: true,
  },
  {
    id: "west_sfakion",
    color: "aegean",
    operatorLabel: { en: "Hora Sfakion / Loutro" },
    stops: ["chania", "sfakion"],
  },
  {
    id: "west_elafonissi",
    color: "aegean",
    operatorLabel: { en: "Elafonissi (summer only)" },
    stops: ["chania", "elafonissi"],
    dashed: true,
  },
  {
    id: "west_plakias",
    color: "aegean",
    operatorLabel: { en: "Plakias (south)" },
    stops: ["rethymno", "plakias"],
  },
  {
    id: "west_anogeia",
    color: "olive",
    operatorLabel: { en: "Anogeia / Psiloritis (mountain)" },
    stops: ["rethymno", "anogeia"],
    dashed: true,
  },

  // ============ EST herlas (terra) ============
  {
    id: "east_main",
    color: "terra",
    operatorLabel: {
      en: "KTEL Heraklion-Lasithi (East)",
      fr: "KTEL Héraklion-Lassithi (Est)",
      de: "KTEL Heraklion-Lasithi (Ost)",
      el: "ΚΤΕΛ Ηρακλείου-Λασιθίου (Ανατολικά)",
    },
    stops: ["heraklion", "hersonissos", "malia", "agios", "sitia"],
  },
  {
    id: "east_elounda",
    color: "terra",
    operatorLabel: { en: "Elounda branch" },
    stops: ["agios", "elounda"],
  },
  {
    id: "east_her_apt",
    color: "terra",
    operatorLabel: { en: "Heraklion Airport bus #1" },
    stops: ["heraklion", "her_apt"],
  },
  {
    id: "east_knossos",
    color: "terra",
    operatorLabel: { en: "Knossos archaeological site" },
    stops: ["heraklion", "knossos"],
  },
  {
    id: "east_ierapetra",
    color: "terra",
    operatorLabel: { en: "Ierapetra / Makrigialos (south coast)" },
    stops: ["agios", "ierapetra", "makrigialos"],
  },
  {
    id: "east_vai",
    color: "terra",
    operatorLabel: { en: "Vai palm beach (summer only)" },
    stops: ["sitia", "vai"],
    dashed: true,
  },
  {
    id: "east_matala",
    color: "olive",
    operatorLabel: { en: "Matala / Messara plain (south)" },
    stops: ["heraklion", "matala"],
    dashed: true,
  },
];

const COLOR_HEX = {
  terra: "var(--color-terra)",
  aegean: "var(--color-aegean)",
  olive: "var(--color-olive)",
} as const;

const STATION_RADIUS = 5.5;
const LINE_STROKE = 5;

type Props = {
  locale: string;
  /** Place name from BusesClient search (raw, ex "Heraklion", "Agios Nikolaos"). */
  fromPlace?: string;
  /** Place name to. */
  toPlace?: string;
};

// Mapping nom de lieu (bus_routes.from_place / to_place) → station.id de la map.
// Normalisé lowercase + trim. Tout ce qui n'est pas dedans = pas de highlight
// (la map reste à pleine opacité).
const PLACE_TO_STATION: Record<string, string> = {
  "heraklion": "heraklion",
  "héraklion": "heraklion",
  "chania": "chania",
  "la canée": "chania",
  "rethymno": "rethymno",
  "rethymnon": "rethymno",
  "agios nikolaos": "agios",
  "sitia": "sitia",
  "hersonissos": "hersonissos",
  "malia": "malia",
  "elounda": "elounda",
  "elounta": "elounda",
  "kissamos": "kissamos",
  "matala": "matala",
  "knossos": "knossos",
  "ierapetra": "ierapetra",
  "makrigialos": "makrigialos",
  "heraklion apt": "her_apt",
  "heraklion airport": "her_apt",
  "chania apt": "chania_apt",
  "chania airport": "chania_apt",
  "elafonissi": "elafonissi",
  "balos": "balos",
};

function placeToStationId(place?: string): string | null {
  if (!place) return null;
  return PLACE_TO_STATION[place.toLowerCase().trim()] ?? null;
}

function pickLoc(locale: string): Loc {
  return (["en", "fr", "de", "el"] as const).includes(locale as Loc)
    ? (locale as Loc)
    : "en";
}

function stationLabel(s: Station, loc: Loc): string {
  return s.label[loc] ?? s.label.en ?? s.id;
}

function lineLabel(l: Line, loc: Loc): string {
  return l.operatorLabel[loc] ?? l.operatorLabel.en ?? l.id;
}

const T = {
  heading: {
    en: "Crete Bus Network",
    fr: "Le réseau bus de la Crète",
    de: "Bus-Netzwerk Kreta",
    el: "Δίκτυο λεωφορείων Κρήτης",
  },
  legend: {
    en: "Network legend",
    fr: "Légende du réseau",
    de: "Netzwerklegende",
    el: "Υπόμνημα δικτύου",
  },
};

export function BusNetworkMap({ locale, fromPlace, toPlace }: Props) {
  const loc = pickLoc(locale);
  // Mobile : plan replié par défaut (le SVG large force un scroll horizontal
  // mediocre). Desktop : ouvert. Le SVG reste dans le DOM (hidden) -> SEO ok.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) setOpen(true);
  }, []);
  const stationById: Record<string, Station> = Object.fromEntries(
    STATIONS.map((s) => [s.id, s]),
  );

  // Highlight logic : 2 stations matchées + lignes qui les couvrent.
  const fromId = placeToStationId(fromPlace);
  const toId = placeToStationId(toPlace);
  const hasHighlight = !!(fromId || toId);
  const highlightedStationIds = new Set<string>(
    [fromId, toId].filter((x): x is string => !!x),
  );
  // Une ligne est "active" si elle touche au moins une des 2 stations highlightées.
  // (Si direct = touche les 2, on la mettra encore plus en valeur via stroke-width.)
  const highlightedLineIds = new Set<string>();
  const directLineIds = new Set<string>();
  for (const line of LINES) {
    const touchesFrom = fromId ? line.stops.includes(fromId) : false;
    const touchesTo = toId ? line.stops.includes(toId) : false;
    if (touchesFrom || touchesTo) highlightedLineIds.add(line.id);
    if (touchesFrom && touchesTo) directLineIds.add(line.id);
  }
  const isStationActive = (id: string) =>
    !hasHighlight || highlightedStationIds.has(id);
  const isLineActive = (id: string) =>
    !hasHighlight || highlightedLineIds.has(id);

  return (
    <section
      aria-labelledby="bus-network-heading"
      className="mb-10 rounded-2xl border border-aegean/15 bg-stone p-5 md:p-8"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full text-left md:pointer-events-none"
      >
        <h2 id="bus-network-heading" className="text-xl font-bold text-aegean mb-1 flex items-center justify-between gap-2">
          {T.heading[loc]}
          <span className={`md:hidden text-text-muted transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </h2>
        <p className="text-sm text-text-muted mb-5">
          {loc === "fr"
            ? "Plan schématique des lignes KTEL · clic sur une station pour voir ses horaires."
            : loc === "de"
              ? "Schematischer Plan der KTEL-Linien · Station klicken für Fahrpläne."
              : loc === "el"
                ? "Σχηματικός χάρτης ΚΤΕΛ · κάντε κλικ στους σταθμούς."
                : "Schematic plan of KTEL bus lines · click a stop for schedules."}
        </p>
      </button>

      <div className={`relative w-full overflow-x-auto ${open ? "" : "hidden"}`}>
        <svg
          viewBox="0 0 1200 420"
          role="img"
          aria-label={T.heading[loc]}
          className="block min-w-[700px] w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Fond très léger */}
          <rect width="1200" height="420" fill="var(--color-sand-warm)" rx="12" />

          {/* Lignes (dessinées AVANT les stations pour passer dessous) */}
          {LINES.map((line) => {
            const points = line.stops
              .map((id) => {
                const s = stationById[id];
                return s ? `${s.x},${s.y}` : null;
              })
              .filter(Boolean)
              .join(" ");
            const active = isLineActive(line.id);
            const isDirect = directLineIds.has(line.id);
            return (
              <polyline
                key={line.id}
                points={points}
                fill="none"
                stroke={COLOR_HEX[line.color]}
                strokeWidth={isDirect ? LINE_STROKE + 2 : LINE_STROKE}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={line.dashed ? "8 8" : undefined}
                opacity={active ? 0.95 : 0.18}
                style={{ transition: "opacity 280ms ease, stroke-width 280ms ease" }}
              />
            );
          })}

          {/* Stations */}
          {STATIONS.map((s) => {
            const isHub = s.id === "heraklion" || s.id === "chania" || s.id === "agios";
            const labelDx = s.anchor === "right" ? 12 : s.anchor === "left" ? -12 : 0;
            const labelDy =
              s.anchor === "above"
                ? -14
                : s.anchor === "below"
                  ? 22
                  : -14;
            const textAnchor =
              s.anchor === "right" ? "start" : s.anchor === "left" ? "end" : "middle";

            const active = isStationActive(s.id);
            const isPinned = highlightedStationIds.has(s.id);
            // Couleur de pin pour from = aegean, pour to = terra (différenciation)
            const pinColor =
              s.id === fromId ? "var(--color-aegean)"
              : s.id === toId ? "var(--color-terra)"
              : null;

            const innerCircle = (
              <g
                opacity={active ? 1 : 0.35}
                style={{ transition: "opacity 280ms ease" }}
              >
                {isPinned && pinColor && (
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={STATION_RADIUS + 8}
                    fill="none"
                    stroke={pinColor}
                    strokeWidth={3}
                    opacity={0.9}
                  />
                )}
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={isPinned ? STATION_RADIUS + 3 : isHub ? STATION_RADIUS + 2 : STATION_RADIUS}
                  fill={isPinned && pinColor ? pinColor : "#FFFFFF"}
                  stroke="var(--color-text)"
                  strokeWidth={2}
                />
                {isHub && !isPinned && (
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={STATION_RADIUS - 1.5}
                    fill="var(--color-text)"
                  />
                )}
                <text
                  x={s.x + labelDx}
                  y={s.y + labelDy}
                  fontSize={isPinned ? 13 : isHub ? 14 : 11}
                  fontWeight={isPinned || isHub ? 700 : 500}
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fill="var(--color-text)"
                  textAnchor={textAnchor}
                >
                  {stationLabel(s, loc)}
                </text>
              </g>
            );

            return s.destSlug ? (
              <a
                key={s.id}
                href={`#${s.destSlug}`}
                aria-label={`${stationLabel(s, loc)} · schedules`}
              >
                {innerCircle}
              </a>
            ) : (
              <g key={s.id}>{innerCircle}</g>
            );
          })}
        </svg>
      </div>

      {/* Légende lignes */}
      <ul className={`mt-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 list-none p-0 text-sm ${open ? "grid" : "hidden"}`}>
        {LINES.filter((l) => !l.id.includes("_apt") && !l.id.includes("_knossos") && l.id !== "east_elounda").map((l) => (
          <li key={l.id} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-8 h-[3px] rounded-full"
              style={{
                background: COLOR_HEX[l.color],
                outline: l.dashed ? "1px dashed currentColor" : undefined,
              }}
            />
            <span className="text-text/90">{lineLabel(l, loc)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
