"use client";
import { motion, useMotionValue, useMotionValueEvent, type MotionValue } from "motion/react";
import { useEffect, useRef } from "react";

const BUS_W = 132; // px ecran (taille fixe, uniforme)

export default function KriKriBus({ stageRef, pathRef, progress, reduce }: {
  stageRef: React.RefObject<HTMLDivElement | null>;
  pathRef: React.RefObject<SVGPathElement | null>;
  progress: MotionValue<number>;
  reduce: boolean;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const lenRef = useRef(0);
  // garde le ref a jour pour les listeners non-React (resize, fonts.ready)
  const reduceRef = useRef(reduce);
  reduceRef.current = reduce;

  const place = (p: number) => {
    const path = pathRef.current;
    const stage = stageRef.current;
    if (!path || !stage || !lenRef.current) return;
    const pt = path.getPointAtLength(p * lenRef.current);
    const m = path.getScreenCTM();
    if (!m) return;
    const sx = pt.x * m.a + pt.y * m.c + m.e;
    const sy = pt.x * m.b + pt.y * m.d + m.f;
    const rect = stage.getBoundingClientRect();
    x.set(sx - rect.left);
    y.set(sy - rect.top);
  };

  useEffect(() => {
    const measure = () => {
      if (!pathRef.current) return;
      lenRef.current = pathRef.current.getTotalLength();
      place(reduceRef.current ? 0 : progress.get());
    };
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    // re-mesure apres chargement des polices (stabilite hauteur)
    document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  useMotionValueEvent(progress, "change", (p) => {
    if (!reduce) place(p);
  });

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[4]"
      style={{
        x,
        y,
        width: BUS_W,
        translateX: "-50%",
        translateY: "-50%",
        filter: "drop-shadow(0 4px 0 rgba(11,57,84,.2))",
      }}
    >
      <svg viewBox="0 0 150 100" style={{ width: "100%", height: "auto", display: "block" }}>
        <ellipse cx="75" cy="94" rx="58" ry="5" fill="#0B3954" opacity="0.12" />
        <g stroke="#0B3954" strokeWidth="3">
          <circle cx="44" cy="84" r="13" fill="#0B3954" />
          <circle cx="44" cy="84" r="5" fill="#FFF9EC" />
          <circle cx="112" cy="84" r="13" fill="#0B3954" />
          <circle cx="112" cy="84" r="5" fill="#FFF9EC" />
        </g>
        <rect x="10" y="26" width="130" height="56" rx="18" fill="#00C2D4" stroke="#0B3954" strokeWidth="4" />
        <line x1="18" y1="68" x2="132" y2="68" stroke="#FFC83D" strokeWidth="6" strokeLinecap="round" />
        <circle cx="17" cy="60" r="4.5" fill="#FFC83D" stroke="#0B3954" strokeWidth="2.5" />
        <rect x="18" y="34" width="114" height="24" rx="9" fill="#EAF7FB" stroke="#0B3954" strokeWidth="3" />
        <line x1="62" y1="34" x2="62" y2="58" stroke="#0B3954" strokeWidth="3" />
        <line x1="96" y1="34" x2="96" y2="58" stroke="#0B3954" strokeWidth="3" />
        <path d="M50 54 Q58 44 62 29" fill="none" stroke="#C98A5B" strokeWidth="6" strokeLinecap="round" />
        <circle cx="63" cy="28" r="5" fill="#E8D2AE" stroke="#0B3954" strokeWidth="2.4" />
        <g transform="translate(14.6,24.3) scale(0.34)">
          <path
            d="M44 36 C28 28 22 12 32 4 C33 15 40 24 51 30 Z"
            fill="#C98A5B"
            stroke="#0B3954"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <path
            d="M76 36 C92 28 98 12 88 4 C87 15 80 24 69 30 Z"
            fill="#C98A5B"
            stroke="#0B3954"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <ellipse cx="33" cy="50" rx="9" ry="5.5" transform="rotate(-22 33 50)" fill="#E8D2AE" stroke="#0B3954" strokeWidth="2.6" />
          <ellipse cx="87" cy="50" rx="9" ry="5.5" transform="rotate(22 87 50)" fill="#E8D2AE" stroke="#0B3954" strokeWidth="2.6" />
          <ellipse cx="60" cy="58" rx="27" ry="25" fill="#F5E9D2" stroke="#0B3954" strokeWidth="2.8" />
          <ellipse cx="60" cy="67" rx="15" ry="10.5" fill="#FFF9EC" />
          <circle cx="55.5" cy="66.5" r="1.5" fill="#0B3954" />
          <circle cx="64.5" cy="66.5" r="1.5" fill="#0B3954" />
          <path
            d="M56 82 C57 89 63 89 64 82 C62 84 58 84 56 82 Z"
            fill="#E8D2AE"
            stroke="#0B3954"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="55" r="3.4" fill="#0B3954" />
          <circle cx="51.2" cy="53.8" r="1.1" fill="#fff" />
          <circle cx="70" cy="55" r="3.4" fill="#0B3954" />
          <circle cx="71.2" cy="53.8" r="1.1" fill="#fff" />
          <path d="M53 72 q7 5.5 14 0" stroke="#0B3954" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </motion.div>
  );
}
