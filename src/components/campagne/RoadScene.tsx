"use client";
import { motion, useTransform, type MotionValue } from "motion/react";
import type { RoadVariant } from "@/lib/campagne";

// top en % de la hauteur du stage, pour chaque variante. Index = ordre des 6 beats narratifs.
export const BEAT_TOP: Record<RoadVariant, number[]> = {
  // Chaque beat est place sur un LOBE de la route ou elle est a un extreme, du cote oppose au texte
  // (probleme/direct = gauche, route a droite ; carte/demain/aide = droite, route a gauche ; marque
  // = sommet centre, route a droite). PAS sur les diagonales ou la route traverse le centre.
  desktop: [18, 36, 48, 60, 72, 82],
  // colonnes etroites cote oppose a la route ; co-concu avec ROAD_D.mobile
  mobile: [15, 28, 41, 54, 66.5, 78],
};
export const CTA_TOP: Record<RoadVariant, number> = { desktop: 95, mobile: 91.5 };
export const ROAD_D: Record<RoadVariant, string> = {
  desktop:
    "M600 470 C980 700 1080 870 1050 1020 C1020 1320 175 1430 155 1720 C135 2030 1070 2110 1050 2420 C1045 2600 1045 2780 1015 2880 C900 3000 720 3110 600 3120 C480 3130 215 3470 190 3760 C170 4050 560 4290 600 4400",
  mobile:
    "M210 360 C340 520 360 620 345 800 C320 1080 90 1180 70 1456 C45 1720 350 1860 350 2132 C350 2420 90 2560 70 2808 C58 3050 85 3250 75 3484 C70 3720 90 3900 80 4056 C76 4250 200 4450 210 4576",
};
export const ROAD_VIEWBOX: Record<RoadVariant, string> = { desktop: "0 0 1200 4720", mobile: "0 0 420 5200" };
export const STAGE_RATIO: Record<RoadVariant, number> = { desktop: 4720 / 1200, mobile: 5200 / 420 };

export default function RoadScene({ variant, progress, reduce, pathRef }: {
  variant: RoadVariant;
  progress: MotionValue<number>;
  reduce: boolean;
  pathRef: React.RefObject<SVGPathElement | null>;
}) {
  const d = ROAD_D[variant];
  const viewBox = ROAD_VIEWBOX[variant];

  // parallax : y = -progress * amplitude (constante si reduce)
  const yFar = useTransform(progress, [0, 1], [0, reduce ? 0 : -120]);
  const yMid = useTransform(progress, [0, 1], [0, reduce ? 0 : -220]);
  const ySummit = useTransform(progress, [0, 1], [0, reduce ? 0 : -90]);
  const yHills = useTransform(progress, [0, 1], [0, reduce ? 0 : -160]);

  return (
    <div className="relative w-full" style={{ aspectRatio: `1 / ${STAGE_RATIO[variant]}` }}>
      {/* CIEL + brouillard + soleil : porte du mockup, etire sur tout le stage */}
      <svg
        className="absolute inset-0 z-0 h-full w-full"
        viewBox="0 0 1200 4720"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="cd-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8FA6B1" />
            <stop offset="12%" stopColor="#A7C2CC" />
            <stop offset="28%" stopColor="#BCDCE6" />
            <stop offset="45%" stopColor="#A8E4EF" />
            <stop offset="57%" stopColor="#CDEFF6" />
            <stop offset="64%" stopColor="#E9FAF0" />
            <stop offset="80%" stopColor="#E7F7EA" />
            <stop offset="100%" stopColor="#FDF1D6" />
          </linearGradient>
          <filter id="cd-fog" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="24" />
          </filter>
        </defs>
        <rect width="1200" height="4720" fill="url(#cd-sky)" />
        {/* brouillard du haut (le probleme) */}
        <g filter="url(#cd-fog)" fill="#ffffff">
          <ellipse cx="300" cy="250" rx="250" ry="58" opacity="0.4" />
          <ellipse cx="850" cy="200" rx="270" ry="52" opacity="0.34" />
          <ellipse cx="560" cy="520" rx="320" ry="74" opacity="0.3" />
          <ellipse cx="980" cy="640" rx="240" ry="50" opacity="0.26" />
        </g>
        {/* soleil du sommet (haut-droite, derriere le titre "Voici crete.direct") */}
        <g transform="translate(1070,2580)">
          <g stroke="#0B3954" strokeWidth="6" strokeLinecap="round">
            <path d="M0 -128 v34 M0 94 v34 M-128 0 h34 M94 0 h34 M-90 -90 l24 24 M66 66 l24 24 M90 -90 l-24 24 M-66 66 l-24 24" />
          </g>
          <circle r="80" fill="#FFC83D" stroke="#0B3954" strokeWidth="6" />
        </g>
      </svg>

      {/* MONTAGNES parallax (4 couches portees du mockup, positionnees en % du stage) */}
      <motion.svg
        className="pointer-events-none absolute left-0 z-[1] w-full"
        style={{ top: "23.3%", height: "31.8%", y: yFar, willChange: "transform" }}
        viewBox="0 0 1200 1500"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0 800 L180 460 L360 720 L560 320 L760 680 L980 400 L1200 740 L1200 1500 L0 1500 Z"
          fill="#BCD4DD"
          opacity="0.72"
        />
      </motion.svg>
      <motion.svg
        className="pointer-events-none absolute left-0 z-[1] w-full"
        style={{ top: "37.1%", height: "31.8%", y: yMid, willChange: "transform" }}
        viewBox="0 0 1200 1500"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0 950 L240 560 L470 920 L700 380 L920 860 L1200 540 L1200 1500 L0 1500 Z"
          fill="#9FC4D6"
          opacity="0.92"
        />
      </motion.svg>
      {/* massif du sommet (le pic enneige derriere le titre) */}
      <motion.svg
        className="pointer-events-none absolute left-0 z-[1] w-full"
        style={{ top: "48.7%", height: "27.9%", y: ySummit, willChange: "transform" }}
        viewBox="0 0 1200 1320"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d="M0 900 L260 420 L520 760 L640 180 L840 620 L1040 320 L1200 560 L1200 1320 L0 1320 Z" fill="#7FB8CE" />
        <path d="M520 760 L640 180 L848 700 Z" fill="#5C9DBA" />
        <path d="M582 384 L640 180 L702 384 L674 362 L648 398 L622 362 L598 394 L582 372 Z" fill="#fff" />
      </motion.svg>
      {/* collines vertes de la redescente */}
      <motion.svg
        className="pointer-events-none absolute left-0 z-[1] w-full"
        style={{ top: "71%", height: "29%", y: yHills, willChange: "transform" }}
        viewBox="0 0 1200 1370"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d="M0 420 L260 200 L520 440 L820 180 L1080 460 L1200 320 L1200 1370 L0 1370 Z" fill="#9FCBA8" />
        <path d="M0 720 L360 500 L720 760 L1040 520 L1200 660 L1200 1370 L0 1370 Z" fill="#7FB58E" />
      </motion.svg>

      {/* LA ROUTE (3 traces partagent d ; le 3e porte la ref pour getPointAtLength) */}
      <svg
        className="absolute inset-0 z-[2] h-full w-full"
        viewBox={viewBox}
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="road2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5A623" />
            <stop offset="100%" stopColor="#FFC83D" />
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke="#0B3954" strokeWidth={variant === "mobile" ? 64 : 48} strokeLinecap="round" />
        <path d={d} fill="none" stroke="url(#road2)" strokeWidth={variant === "mobile" ? 50 : 36} strokeLinecap="round" />
        <path
          ref={pathRef}
          d={d}
          fill="none"
          stroke="#fff"
          strokeWidth={5}
          strokeDasharray="26 34"
          strokeLinecap="round"
          opacity={0.85}
        />
        {/* pin destination au bout de la route */}
        <g transform={variant === "mobile" ? "translate(210,4576)" : "translate(600,4400)"}>
          <path
            d="M0 8 C-26 -34 -34 -52 -34 -70 A34 34 0 1 1 34 -70 C34 -52 26 -34 0 8 Z"
            fill="#ED7A5C"
            stroke="#0B3954"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <circle cx="0" cy="-70" r="13" fill="#fff" stroke="#0B3954" strokeWidth="5" />
        </g>
      </svg>
    </div>
  );
}
