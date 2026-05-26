// BusNetworkMap - plan du réseau KTEL Crète style Harry Beck (Paris metro).
// Server component (SSG-friendly, SEO : le SVG est dans le HTML).
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
  /** "town" | "airport" | "beach" | "site" */
  kind?: "town" | "airport" | "beach" | "site";
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
  // Ligne nord (gauche → droite, ouest → est)
  { id: "kissamos",  label: { en: "Kissamos" },                                   x: 80,   y: 180, kind: "town" },
  { id: "chania_apt",label: { en: "Chania Apt", fr: "Aéroport La Canée" },        x: 200,  y: 90,  kind: "airport", anchor: "above" },
  { id: "chania",    label: { en: "Chania", fr: "La Canée" },                     x: 220,  y: 180, kind: "town", destSlug: "chania" },
  { id: "rethymno",  label: { en: "Rethymno", fr: "Rethymnon" },                  x: 410,  y: 180, kind: "town", destSlug: "rethymno" },
  { id: "heraklion", label: { en: "Heraklion", fr: "Héraklion" },                 x: 640,  y: 180, kind: "town", destSlug: "heraklion" },
  { id: "her_apt",   label: { en: "Heraklion Apt", fr: "Aéroport Héraklion" },    x: 700,  y: 90,  kind: "airport", anchor: "above" },
  { id: "hersonissos",label:{ en: "Hersonissos" },                                x: 780,  y: 180, kind: "town", destSlug: "hersonissos" },
  { id: "malia",     label: { en: "Malia" },                                      x: 850,  y: 180, kind: "town", destSlug: "malia" },
  { id: "agios",     label: { en: "Agios Nikolaos" },                             x: 970,  y: 180, kind: "town", destSlug: "agios-nikolaos" },
  { id: "elounda",   label: { en: "Elounda" },                                    x: 990,  y: 90,  kind: "town", anchor: "above" },
  { id: "sitia",     label: { en: "Sitia" },                                      x: 1120, y: 180, kind: "town", destSlug: "sitia" },

  // Sud (ligne secondaire)
  { id: "matala",    label: { en: "Matala" },                                     x: 580,  y: 330, kind: "beach", anchor: "below", destSlug: "matala" },
  { id: "knossos",   label: { en: "Knossos" },                                    x: 640,  y: 260, kind: "site", anchor: "below", destSlug: "knossos" },
  { id: "ierapetra", label: { en: "Ierapetra" },                                  x: 920,  y: 330, kind: "town", anchor: "below", destSlug: "ierapetra" },
  { id: "makrigialos",label:{ en: "Makrigialos" },                                x: 1010, y: 330, kind: "town", anchor: "below" },

  // Branches saisonnières ouest
  { id: "elafonissi",label: { en: "Elafonissi" },                                 x: 100,  y: 330, kind: "beach", anchor: "below", destSlug: "elafonissi" },
  { id: "balos",     label: { en: "Balos" },                                      x: 60,   y: 90,  kind: "beach", anchor: "above", destSlug: "balos" },
];

const LINES: Line[] = [
  // OUEST ektel (aegean)
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
    id: "west_elafonissi",
    color: "aegean",
    operatorLabel: { en: "Elafonissi (summer only)" },
    stops: ["chania", "elafonissi"],
    dashed: true,
  },
  {
    id: "west_balos",
    color: "aegean",
    operatorLabel: { en: "Balos / Gramvousa (summer only)" },
    stops: ["kissamos", "balos"],
    dashed: true,
  },

  // EST herlas (terra)
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
  /** Locale du domaine (default fr). */
  baseLocale?: Loc;
  /** Préfixe ancre destination (default `#`). */
  anchorPrefix?: string;
};

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

export function BusNetworkMap({ locale }: Props) {
  const loc = pickLoc(locale);
  const stationById: Record<string, Station> = Object.fromEntries(
    STATIONS.map((s) => [s.id, s]),
  );

  return (
    <section
      aria-labelledby="bus-network-heading"
      className="mb-10 rounded-2xl border border-aegean/15 bg-stone p-5 md:p-8"
    >
      <h2 id="bus-network-heading" className="text-xl font-bold text-aegean mb-1">
        {T.heading[loc]}
      </h2>
      <p className="text-sm text-text-muted mb-5">
        {loc === "fr"
          ? "Plan schématique des lignes KTEL — clic sur une station pour voir ses horaires."
          : loc === "de"
            ? "Schematischer Plan der KTEL-Linien — Station klicken für Fahrpläne."
            : loc === "el"
              ? "Σχηματικός χάρτης ΚΤΕΛ — κάντε κλικ στους σταθμούς."
              : "Schematic plan of KTEL bus lines — click a stop for schedules."}
      </p>

      <div className="relative w-full overflow-x-auto">
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
            return (
              <polyline
                key={line.id}
                points={points}
                fill="none"
                stroke={COLOR_HEX[line.color]}
                strokeWidth={LINE_STROKE}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={line.dashed ? "8 8" : undefined}
                opacity={0.9}
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

            const innerCircle = (
              <>
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={isHub ? STATION_RADIUS + 2 : STATION_RADIUS}
                  fill="#FFFFFF"
                  stroke="var(--color-text)"
                  strokeWidth={2}
                />
                {isHub && (
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
                  fontSize={isHub ? 14 : 11}
                  fontWeight={isHub ? 700 : 500}
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fill="var(--color-text)"
                  textAnchor={textAnchor}
                >
                  {stationLabel(s, loc)}
                </text>
              </>
            );

            return s.destSlug ? (
              <a
                key={s.id}
                href={`#${s.destSlug}`}
                aria-label={`${stationLabel(s, loc)} — schedules`}
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
      <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 list-none p-0 text-sm">
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
