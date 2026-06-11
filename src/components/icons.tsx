// Icônes signature Crete Direct · set propriétaire, remplace lucide aux
// points à forte visibilité (outils home, LiveBar, Explore, logo, taxi).
// Langage : grille 24, trait 1.75, terminaisons rondes, ADN spirale/vague
// minoenne (fresques de Knossos). Validé sur planche d'essai 11/06/2026.
// Même usage que lucide : <CiBus className="w-5 h-5 text-aegean" />.
import type { SVGProps } from "react";

type P = Omit<SVGProps<SVGSVGElement>, "strokeWidth">;

function Svg({ children, strokeWidth = 1.75, ...props }: P & { strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

/** Le mark : spirale minoenne (logo, favicon, pastille live, OG). */
export function CiMark(props: P) {
  return (
    <Svg strokeWidth={2.1} {...props}>
      <path d="M12 3.2a8.8 8.8 0 1 1-8.8 8.8A7 7 0 0 1 10.2 5a5.6 5.6 0 0 1 5.6 5.6 4.4 4.4 0 0 1-4.4 4.4 3.4 3.4 0 0 1-3.4-3.4 2.5 2.5 0 0 1 2.5-2.5 1.7 1.7 0 0 1 1.7 1.7" />
    </Svg>
  );
}

/** Bus KTEL, bande latérale ondulée (les cars crétois l'ont vraiment). */
export function CiBus(props: P) {
  return (
    <Svg {...props}>
      <path d="M3 16.4V8a2.6 2.6 0 0 1 2.6-2.6h12.8A2.6 2.6 0 0 1 21 8v8.4" />
      <path d="M3 10.2h18" />
      <path d="M12 5.4v4.8" />
      <path d="M4.6 13.6q1.85-1.8 3.7 0t3.7 0t3.7 0t3.7 0" />
      <circle cx="7.2" cy="17.4" r="1.8" />
      <circle cx="16.8" cy="17.4" r="1.8" />
    </Svg>
  );
}

/** Vague dont la crête s'enroule en spirale (motif fresque minoenne). */
export function CiWave(props: P) {
  return (
    <Svg {...props}>
      <path d="M2.6 15.5c2.6 0 4-1.6 5.8-3.4 2.2-2.2 4.4-3.6 7.2-3.4 2.8.2 4.6 2 4.5 4.1-.1 1.9-1.6 3-3.2 2.9-1.4-.1-2.4-1.1-2.3-2.4.1-1 .9-1.7 1.9-1.6" />
      <path d="M2.6 20q2.4-1.4 4.8 0t4.8 0t4.8 0t4.8 0" strokeWidth={1.4} />
    </Svg>
  );
}

/** Soleil au disque-spirale. */
export function CiSun(props: P) {
  return (
    <Svg {...props}>
      <path d="M12 7.4a4.6 4.6 0 0 1 4.6 4.6 4.6 4.6 0 0 1-4.6 4.6 3.2 3.2 0 0 1-3.2-3.2 2.2 2.2 0 0 1 2.2-2.2 1.5 1.5 0 0 1 1.5 1.5" />
      <path d="M12 2.2v2M12 19.8v2M2.2 12h2M19.8 12h2M5.1 5.1l1.4 1.4M17.5 17.5l1.4 1.4M18.9 5.1l-1.4 1.4M6.5 17.5l-1.4 1.4" />
    </Svg>
  );
}

/** Boussole à aiguille-lame courbée. */
export function CiCompass(props: P) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v1.6M12 19.4V21M3 12h1.6M19.4 12H21" strokeWidth={1.4} />
      <path d="M16.2 7.8c-1.6 1.6-2.6 3.1-3.1 5.3-2.2.5-3.7 1.5-5.3 3.1 1.6-1.6 2.6-3.1 3.1-5.3 2.2-.5 3.7-1.5 5.3-3.1z" />
    </Svg>
  );
}

/** Avion-voyage (paper plane) avec traînée ondulée. */
export function CiPlane(props: P) {
  return (
    <Svg {...props}>
      <path d="M20.6 3.4 11 13" />
      <path d="M20.6 3.4l-5.8 16.2-3.8-6.4-6.4-3.8z" />
      <path d="M3 19.6q1.6-1.4 3.2 0t3.2 0" strokeWidth={1.4} />
    </Svg>
  );
}

/** Data : barres posées sur un axe-vague. */
export function CiChart(props: P) {
  return (
    <Svg {...props}>
      <path d="M5.4 17V11.8M10.2 17V5.8M15 17v-7M19.8 17V8.4" />
      <path d="M3 20.4q2.25-1.3 4.5 0t4.5 0t4.5 0t4.5 0" strokeWidth={1.4} />
    </Svg>
  );
}

/** Montagnes crétoises, soleil-arc derrière le pic. */
export function CiMountain(props: P) {
  return (
    <Svg {...props}>
      <path d="M3.4 19.2 9.2 8.4l3.4 6 3-4.8 5 9.6z" />
      <path d="M18.4 5.4a2.1 2.1 0 1 0-2.6-2.6" strokeWidth={1.4} />
    </Svg>
  );
}

/** Fourchette + rameau d'olivier (la table crétoise). */
export function CiFood(props: P) {
  return (
    <Svg {...props}>
      <path d="M7.1 2.8V21" />
      <path d="M4.9 2.8v4.6a2.2 2.2 0 0 0 4.4 0V2.8" />
      <path d="M16.4 21c0-6.5 1.1-11.5 3.6-16.5" />
      <path d="M17.8 10.4c1.8-.3 3-1.3 3.5-3.1-1.8.3-3 1.3-3.5 3.1zM16.8 14.6c-1.8-.3-3-1.3-3.5-3.1 1.8.3 3 1.3 3.5 3.1z" strokeWidth={1.4} />
    </Svg>
  );
}

/** Sentier pointillé en vague vers le drapeau du sommet. */
export function CiHike(props: P) {
  return (
    <Svg {...props}>
      <path d="M3 20.2c3 0 4-2.6 6.5-4.6s4.5-3.3 7-6" strokeDasharray="0.1 3.4" />
      <path d="M16.5 9.6V3.6l3.8 1.6-3.8 1.6" />
    </Svg>
  );
}

/** Calendrier à case-spirale (le jour qui compte). */
export function CiCalendar(props: P) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15.4" rx="2.4" />
      <path d="M3.5 9.8h17M8 2.8v4M16 2.8v4" />
      <path d="M12.3 13.2a2.3 2.3 0 1 1-2.3 2.3 1.7 1.7 0 0 1 1.7-1.7" strokeWidth={1.4} />
    </Svg>
  );
}

/** Journal dont la dernière ligne devient une vague. */
export function CiNews(props: P) {
  return (
    <Svg {...props}>
      <path d="M4.5 3.6h12.6a1.8 1.8 0 0 1 1.8 1.8v13a2.4 2.4 0 0 1-2.4 2.4H6.9a2.4 2.4 0 0 1-2.4-2.4z" />
      <path d="M7.6 7.8h6.4M7.6 11.2h6.4M7.6 14.6h4" strokeWidth={1.4} />
      <path d="M7.6 17.6q1.1-1 2.2 0t2.2 0" strokeWidth={1.4} />
    </Svg>
  );
}

/** Taxi profil, enseigne sur le toit. */
export function CiTaxi(props: P) {
  return (
    <Svg {...props}>
      <path d="M10.6 7V5.2h2.8V7" />
      <path d="M7 11l1.3-2.9A1.8 1.8 0 0 1 10 7h4a1.8 1.8 0 0 1 1.7 1.1L17 11" />
      <path d="M4.6 16.4V14a3 3 0 0 1 3-3h8.8a3 3 0 0 1 3 3v2.4" />
      <circle cx="7.4" cy="17.6" r="1.7" />
      <circle cx="16.6" cy="17.6" r="1.7" />
      <path d="M9.1 17.6h5.8" strokeWidth={1.4} />
    </Svg>
  );
}

/** Ferry sur la vague signature. */
export function CiFerry(props: P) {
  return (
    <Svg {...props}>
      <path d="M4.4 13.8h15.2l-1.6 3.2a2 2 0 0 1-1.8 1.1H7.8A2 2 0 0 1 6 17z" />
      <path d="M7.6 13.8V9.6h8.8v4.2M10.6 9.6V7.2h2.8v2.4" />
      <path d="M3 21.6q2.25-1.3 4.5 0t4.5 0t4.5 0t4.5 0" strokeWidth={1.4} />
    </Svg>
  );
}

/** Nuage (voix météo du set). */
export function CiCloud(props: P) {
  return (
    <Svg {...props}>
      <path d="M6.8 18.4a4.4 4.4 0 1 1 .7-8.7 5.3 5.3 0 0 1 10.3 1.2 3.7 3.7 0 0 1-1 7.5z" />
    </Svg>
  );
}

/** Pluie. */
export function CiRain(props: P) {
  return (
    <Svg {...props}>
      <path d="M6.8 15.8a4.2 4.2 0 1 1 .7-8.3 5.1 5.1 0 0 1 9.9 1.1 3.5 3.5 0 0 1-1 6.9z" />
      <path d="M8.4 19.2l-.7 2M12.2 19.2l-.7 2M16 19.2l-.7 2" strokeWidth={1.4} />
    </Svg>
  );
}

/** Livre-guide aux pages courbes. */
export function CiBook(props: P) {
  return (
    <Svg {...props}>
      <path d="M12 6.6C10.2 5 7.8 4.2 5 4.2v14c2.8 0 5.2.8 7 2.4 1.8-1.6 4.2-2.4 7-2.4v-14c-2.8 0-5.2.8-7 2.4z" />
      <path d="M12 6.6v14" strokeWidth={1.4} />
    </Svg>
  );
}

/** Citadine compacte, profil arrondi. */
export function CiCarCity(props: P) {
  return (
    <Svg {...props}>
      <path d="M5 11.2l1.4-3A1.8 1.8 0 0 1 8 7.2h5.4a1.8 1.8 0 0 1 1.6 1l1.5 3" />
      <path d="M3.6 16V14a2.8 2.8 0 0 1 2.8-2.8h10.2a2.8 2.8 0 0 1 2.8 2.8v2" />
      <circle cx="7.2" cy="16.8" r="1.7" />
      <circle cx="16.2" cy="16.8" r="1.7" />
      <path d="M8.9 16.8h5.6" strokeWidth={1.4} />
      <path d="M19.4 11.1q1-.9 0-1.8" strokeWidth={1.4} />
    </Svg>
  );
}

/** Berline compacte : profil bas, cabine décalée, long coffre. */
export function CiCarCompact(props: P) {
  return (
    <Svg {...props}>
      <path d="M4.6 11.3l1.4-2.6a1.8 1.8 0 0 1 1.6-1h4.6a1.8 1.8 0 0 1 1.6 1l1.4 2.6" />
      <path d="M2.6 16v-1.7a2.4 2.4 0 0 1 2.4-2.4h14a2.4 2.4 0 0 1 2.4 2.4V16" />
      <circle cx="6.6" cy="16.6" r="1.7" />
      <circle cx="17.4" cy="16.6" r="1.7" />
      <path d="M8.3 16.6h7.4" strokeWidth={1.4} />
      <path d="M9.9 7.7v3.6" strokeWidth={1.4} />
    </Svg>
  );
}

/** SUV / 4x4 : caisse haute, barres de toit, garde au sol, grosses roues. */
export function CiCarSuv(props: P) {
  return (
    <Svg {...props}>
      <path d="M5.9 10.2l.7-2.4A1.9 1.9 0 0 1 8.4 6.4h7.2a1.9 1.9 0 0 1 1.8 1.4l.7 2.4" />
      <path d="M3.8 14.9v-2.5a2.2 2.2 0 0 1 2.2-2.2h12a2.2 2.2 0 0 1 2.2 2.2v2.5" />
      <circle cx="7.1" cy="16.9" r="2" />
      <circle cx="16.9" cy="16.9" r="2" />
      <path d="M9.8 16.9h4.4" strokeWidth={1.4} />
      <path d="M8.6 4.9h6.8" strokeWidth={1.4} />
      <path d="M12 6.4v3.8" strokeWidth={1.4} />
    </Svg>
  );
}

/** Familiale / monospace : caisse longue, arrière droit, trois vitres. */
export function CiCarFamily(props: P) {
  return (
    <Svg {...props}>
      <path d="M4.4 11.2l1.8-3.1a1.8 1.8 0 0 1 1.6-.9h8.6a1.8 1.8 0 0 1 1.8 1.8v2.2" />
      <path d="M2.4 16v-1.9a2.4 2.4 0 0 1 2.4-2.4h14.4a2.4 2.4 0 0 1 2.4 2.4V16" />
      <circle cx="6.4" cy="16.7" r="1.7" />
      <circle cx="17.6" cy="16.7" r="1.7" />
      <path d="M8.1 16.7h7.8" strokeWidth={1.4} />
      <path d="M9.4 7.2v4M13.4 7.2v4" strokeWidth={1.4} />
    </Svg>
  );
}

/** Scooter : selle arrière, plancher plat, tablier remontant au guidon. */
export function CiScooter(props: P) {
  return (
    <Svg {...props}>
      <circle cx="5.6" cy="16.8" r="2" />
      <circle cx="17.9" cy="16.8" r="2" />
      <path d="M3.8 10.8h3.4a2 2 0 0 1 2 2v1.6h4.3l2.7-6" />
      <path d="M16.2 8.4l1.6 6.5" />
      <path d="M16.2 8.4h-2.8" strokeWidth={1.4} />
    </Svg>
  );
}
