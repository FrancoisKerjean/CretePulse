"use client";
import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";

export default function Beat({ side, topPct, reduce, kicker, title, sub, hero, inline, mobile }: {
  side: "center" | "left" | "right";
  topPct: number;
  reduce: boolean;
  kicker?: string;
  title?: string;
  sub?: string;
  hero?: boolean;
  inline?: boolean;
  mobile?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  // no-JS / pre-hydratation : visible. Apres hydratation : cache jusqu'a in-view (sauf reduce/hero).
  const hidden = mounted && !reduce && !hero && !inView;

  // Mobile : colonne etroite plaquee du cote oppose a la route. left -> colonne gauche
  // alignee a gauche ; right ou center -> colonne droite alignee a droite. hero/inline restent centres.
  const mobileColumn = mobile && !hero && !inline;
  // hero/inline mobile : on force le centrage meme si side != center.
  const effectiveCenter = (side === "center" || hero || inline) && !mobileColumn;
  const mobileLeftCol = mobileColumn && side === "left";

  const align = mobileColumn
    ? mobileLeftCol
      ? "items-start text-left"
      : "items-end text-right"
    : side === "right"
      ? "items-end text-right"
      : side === "left"
        ? "items-start text-left"
        : "items-center text-center";

  // Desktop : largeurs et marges en POURCENTAGE de largeur, pas en px. La route est un SVG
  // preserveAspectRatio="none" : sa position x scale avec la largeur, donc son x reste un %
  // constant. Des beats en px (ex. 540px) cassaient l'alignement hors ~1200px et chevauchaient
  // la route. En %, beats et route suivent la meme echelle a TOUTE largeur.
  // Le beat centre du sommet ("marque") a la route a ~87% -> 60% centre (x20-80%) la degage ;
  // hero/cta n'ont pas de route a cote -> larges.
  const pos = mobileColumn
    ? mobileLeftCol
      ? "left-[clamp(14px,4vw,28px)] w-[56%]"
      : "right-[clamp(14px,4vw,28px)] w-[56%]"
    : effectiveCenter
      ? hero
        ? "left-0 right-0 mx-auto w-[88%]"
        : "left-0 right-0 mx-auto w-[60%]"
      : side === "left"
        ? "left-[4%] w-[47%]"
        : "right-[4%] w-[47%]";

  return (
    <div
      ref={ref}
      className={`${inline ? "" : "absolute"} z-[3] flex flex-col ${align} ${inline ? "" : pos}`}
      style={inline ? undefined : { top: `${topPct}%` }}
    >
      <div
        className="transition-[opacity,transform] duration-700 ease-out"
        style={{ opacity: hidden ? 0 : 1, transform: hidden ? `translateY(${reduce ? 0 : 36}px)` : "none" }}
      >
        {kicker && (
          <span className="mb-3 inline-block rounded-full border-[2.5px] border-[var(--color-text)] bg-white/80 px-4 py-1.5 text-[13px] font-extrabold uppercase tracking-[2px] text-[var(--color-text)]">
            {kicker}
          </span>
        )}
        {title && (
          <h2
            className={`font-[family-name:var(--font-heading)] font-extrabold leading-[1.05] text-[var(--color-text)] [text-shadow:0_2px_0_rgba(255,255,255,.65),0_0_28px_rgba(255,255,255,.8)] [&_hl]:rounded-[5px] [&_hl]:bg-sun [&_hl]:box-decoration-clone [&_hl]:shadow-[0_0_0_8px_var(--color-sun)] ${hero ? "text-[clamp(34px,7vw,64px)]" : "text-[clamp(28px,5.4vw,46px)]"}`}
            dangerouslySetInnerHTML={{ __html: title }}
          />
        )}
        {sub && (
          <p
            className="mt-4 text-[clamp(16px,2.8vw,25px)] font-semibold leading-[1.38] text-[var(--color-text)] [text-shadow:0_1px_0_rgba(255,255,255,.75)]"
            dangerouslySetInnerHTML={{ __html: sub }}
          />
        )}
      </div>
    </div>
  );
}
