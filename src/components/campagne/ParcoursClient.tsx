"use client";
import { useEffect, useRef, useState } from "react";
import { useScroll, useReducedMotion } from "motion/react";
import { pickRoadVariant, type CampagneCopy, type RoadVariant } from "@/lib/campagne";
import RoadScene, { BEAT_TOP, CTA_TOP } from "./RoadScene";
import KriKriBus from "./KriKriBus";
import Beat from "./Beat";
import HelpButtons from "./HelpButtons";
import ScrollCue from "./ScrollCue";
import HelpPill from "./HelpPill";

function useRoadVariant(ref: React.RefObject<HTMLElement | null>): RoadVariant {
  const [variant, setVariant] = useState<RoadVariant>("mobile");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setVariant(pickRoadVariant(el.clientWidth)));
    ro.observe(el);
    setVariant(pickRoadVariant(el.clientWidth));
    return () => ro.disconnect();
  }, [ref]);
  return variant;
}

export default function ParcoursClient({ locale, copy }: { locale: string; copy: CampagneCopy }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const reduce = useReducedMotion() ?? false;
  const variant = useRoadVariant(stageRef);
  const { scrollYProgress } = useScroll({ target: stageRef, offset: ["start start", "end end"] });

  return (
    <main className="relative w-full overflow-hidden bg-sky">
      {/* fond ciel CSS plat (couleur instantanee avant paint SVG) deja via bg-sky */}
      <div ref={stageRef} className="relative mx-auto w-full">
        <RoadScene variant={variant} progress={scrollYProgress} reduce={reduce} pathRef={pathRef} />
        <KriKriBus stageRef={stageRef} pathRef={pathRef} progress={scrollYProgress} reduce={reduce} />

        {/* watermark crete.direct */}
        <div className="absolute left-1/2 top-[30px] z-[6] -translate-x-1/2 rounded-full border-[3px] border-[var(--color-text)] bg-white px-[22px] py-2 text-[22px] font-extrabold text-[var(--color-text)] shadow-[0_5px_0_var(--color-text)]">
          crete<span className="text-lagoon">.</span>direct
        </div>

        {/* HERO */}
        <Beat side="center" topPct={3} reduce={reduce} title={copy.hero.title} sub={copy.hero.sub} hero mobile={variant === "mobile"} />

        {/* BEATS (topPct par variante : table de waypoints exportee par RoadScene) */}
        {copy.beats.map((b, i) => (
          <Beat
            key={b.id}
            side={b.side}
            topPct={BEAT_TOP[variant][i]}
            reduce={reduce}
            kicker={b.kicker}
            title={b.title}
            sub={b.sub}
            mobile={variant === "mobile"}
          />
        ))}

        {/* CTA */}
        <div
          className="absolute left-0 right-0 z-[5] mx-auto w-[min(92%,920px)] text-center"
          style={{ top: `${CTA_TOP[variant]}%` }}
        >
          <Beat side="center" topPct={0} reduce={reduce} title={copy.cta.title} inline mobile={variant === "mobile"} />
          <HelpButtons locale={locale} copy={copy} />
          <p className="mt-5 text-[clamp(15px,2.6vw,20px)] font-semibold text-[var(--color-text)]">{copy.cta.micro}</p>
        </div>
      </div>

      <ScrollCue reduce={reduce} />
      <HelpPill ctaTop={CTA_TOP[variant]} copy={copy} />
    </main>
  );
}
