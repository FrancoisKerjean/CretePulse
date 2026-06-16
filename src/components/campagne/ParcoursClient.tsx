"use client";
import { useReducedMotion } from "motion/react";
import { type CampagneCopy, BEAT_CONFIG } from "@/lib/campagne";
import RoadDecor from "./RoadDecor";
import BeatRow, { SCENES } from "./BeatRow";
import Card from "./Card";
import Reveal from "./Reveal";
import HelpButtons from "./HelpButtons";
import HelpPill from "./HelpPill";

// Ciel en gradient CSS (porte du mockup : journey grey -> lagoon -> green -> cream).
const SKY =
  "linear-gradient(180deg,#90A7B2 0%,#A7C2CC 11%,#BCDCE6 28%,#A8E4EF 46%,#CDEFF6 58%,#E9FAF0 70%,#E7F7EA 85%,#FDF1D6 100%)";

export default function ParcoursClient({ locale, copy }: { locale: string; copy: CampagneCopy }) {
  const reduce = useReducedMotion() ?? false;
  const SummitScene = SCENES.summit;
  const HeroScene = SCENES.terminal;

  return (
    <main className="relative w-full overflow-hidden" style={{ background: SKY }}>
      <RoadDecor />

      <div className="relative z-[3] mx-auto w-full max-w-[1200px]">
        {/* watermark crete.direct */}
        <div className="mx-auto mt-[30px] w-max rounded-full border-[3px] border-[var(--color-text)] bg-white px-[22px] py-2 text-[22px] font-extrabold text-[var(--color-text)] shadow-[0_5px_0_var(--color-text)]">
          crete<span className="text-lagoon">.</span>direct
        </div>

        {/* HERO (centre : card puis scene) */}
        <section className="flex flex-col items-center gap-[clamp(24px,4vw,34px)] px-[clamp(20px,5vw,60px)] py-[clamp(34px,5vw,46px)] text-center">
          <Reveal reduce={reduce} className="flex w-full justify-center">
            <Card kicker={copy.hero.kicker} kickerVariant="go" title={copy.hero.title} sub={copy.hero.sub} size="hero" reduce={reduce} />
          </Reveal>
          <Reveal reduce={reduce} delay={120} className="flex w-full justify-center">
            <HeroScene />
          </Reveal>
        </section>

        {/* BEATS narratifs : row (scene+card alternees) ou center (sommet) */}
        {copy.beats.map((beat) => {
          const config = BEAT_CONFIG[beat.id];
          if (!config) return null;
          if (config.layout === "center") {
            return (
              <section
                key={beat.id}
                className="flex flex-col items-center gap-[clamp(24px,4vw,34px)] px-[clamp(20px,5vw,60px)] py-[clamp(34px,5vw,46px)] text-center"
              >
                <Reveal reduce={reduce} className="flex w-full justify-center">
                  <SummitScene />
                </Reveal>
                <Reveal reduce={reduce} delay={120} className="flex w-full justify-center">
                  <Card
                    kicker={beat.kicker}
                    kickerVariant={config.kickerVariant}
                    tag={config.tag}
                    title={beat.title}
                    sub={beat.sub}
                    size="wide"
                    reduce={reduce}
                  />
                </Reveal>
              </section>
            );
          }
          return <BeatRow key={beat.id} beat={beat} config={config} reduce={reduce} />;
        })}

        {/* CTA (centre, ancre #cta pour la pastille Aider) */}
        <section id="cta" className="flex flex-col items-center px-[clamp(20px,5vw,60px)] pb-[90px] pt-[clamp(34px,5vw,46px)] text-center">
          <Reveal reduce={reduce} className="flex w-full flex-col items-center">
            <Card title={copy.cta.title} size="wide" reduce={reduce} />
            <HelpButtons locale={locale} copy={copy} />
            <p className="mt-[14px] text-[clamp(15px,2.6vw,20px)] font-semibold text-[var(--color-text)]">{copy.cta.micro}</p>
          </Reveal>
        </section>
      </div>

      <HelpPill copy={copy} />
    </main>
  );
}
