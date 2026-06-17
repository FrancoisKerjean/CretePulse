"use client";
import { useReducedMotion } from "motion/react";
import type { ProCopy } from "@/lib/campagne-pro";
import RoadDecor from "../RoadDecor";
import Card from "../Card";
import Reveal from "../Reveal";
import { SCENES } from "../BeatRow";
import DataToVision from "./DataToVision";
import SponsorDoors from "./SponsorDoors";
import LeadForm from "./LeadForm";

const SKY = "linear-gradient(180deg,#90A7B2 0%,#A7C2CC 11%,#BCDCE6 28%,#A8E4EF 46%,#CDEFF6 58%,#E9FAF0 70%,#E7F7EA 85%,#FDF1D6 100%)";

function EmojiBox({ emoji, cap }: { emoji: string; cap?: string }) {
  return (
    <div className="w-[260px] rounded-[20px] border-[3px] border-[var(--color-text)] bg-white p-[18px] text-center shadow-[0_6px_0_var(--color-text)]">
      <div className="text-[56px] leading-none">{emoji}</div>
      {cap && <div className="mt-2 font-[family-name:var(--font-heading)] text-[13px] font-bold text-[var(--color-muted,#56707d)]">{cap}</div>}
    </div>
  );
}

export default function ProParcours({ locale, copy }: { locale: string; copy: ProCopy }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <main className="relative w-full overflow-hidden" style={{ background: SKY }}>
      <RoadDecor />
      <div className="relative z-[3] mx-auto w-full max-w-[1100px]">

        {/* HERO */}
        <section className="flex flex-col items-center gap-[clamp(24px,4vw,34px)] px-[clamp(20px,5vw,60px)] py-[clamp(34px,5vw,46px)] text-center">
          <Reveal reduce={reduce} className="flex w-full justify-center">
            <Card kicker={copy.hero.kicker} kickerVariant={copy.hero.kickerVariant} title={copy.hero.title} sub={copy.hero.sub} size="hero" reduce={reduce} />
          </Reveal>
          {copy.stats.length > 0 && (
            <Reveal reduce={reduce} delay={100} className="grid w-full max-w-[760px] grid-cols-2 gap-[12px] md:grid-cols-4">
              {copy.stats.map((s) => (
                <div key={s.l} className="rounded-[16px] border-[3px] border-[var(--color-text)] bg-white p-[14px] text-center shadow-[0_5px_0_var(--color-text)]">
                  <div className="font-[family-name:var(--font-heading)] text-[22px] font-extrabold text-aegean">{s.n}</div>
                  <div className="mt-1 text-[11px] text-[var(--color-muted,#56707d)]">{s.l}</div>
                </div>
              ))}
            </Reveal>
          )}
        </section>

        {/* BEATS scene + card alternes */}
        {copy.beats.map((b) => {
          const Scene = b.scene ? SCENES[b.scene] : null;
          return (
            <section key={b.id} className="flex w-full items-center justify-center px-[clamp(20px,5vw,60px)] py-[clamp(28px,5vw,42px)]">
              <div className="grid w-full max-w-[1100px] grid-cols-1 items-center gap-[clamp(24px,5vw,50px)] md:grid-cols-2">
                <Reveal reduce={reduce} className={`flex items-center justify-center ${b.flip ? "md:order-2" : "md:order-1"}`}>
                  {Scene ? <Scene /> : <EmojiBox emoji={b.emoji ?? "✨"} cap={b.emojiCap} />}
                </Reveal>
                <Reveal reduce={reduce} delay={100} className={`flex items-center justify-center ${b.flip ? "md:order-1" : "md:order-2"}`}>
                  <Card kicker={b.kicker} kickerVariant={b.kickerVariant} title={b.title} sub={b.body} reduce={reduce} />
                </Reveal>
              </div>
            </section>
          );
        })}

        {/* FRISE data -> 2028 */}
        <section className="flex flex-col items-center gap-[18px] px-[clamp(20px,5vw,60px)] py-[clamp(28px,5vw,42px)] text-center">
          <Reveal reduce={reduce} className="flex w-full justify-center">
            <Card kicker={copy.frise.kicker} kickerVariant="calm" title={copy.frise.title} sub={copy.frise.sub} size="wide" reduce={reduce} />
          </Reveal>
          <Reveal reduce={reduce} delay={100} className="flex w-full justify-center">
            <DataToVision frise={copy.frise} />
          </Reveal>
        </section>

        {/* ASK + dossier (institutions) */}
        {copy.ask && (
          <section className="flex flex-col items-center gap-[18px] px-[clamp(20px,5vw,60px)] py-[clamp(28px,5vw,42px)] text-center">
            <Reveal reduce={reduce} className="flex w-full flex-col items-center gap-3">
              <Card kicker={copy.ask.kicker} kickerVariant="terra" title={copy.ask.title} sub={copy.ask.body} size="wide" reduce={reduce} />
              <a href={copy.ask.dossierHref} className="inline-flex items-center gap-2 rounded-full border-[3px] border-[var(--color-text)] bg-sun px-5 py-[11px] font-[family-name:var(--font-heading)] text-[14.5px] font-extrabold text-[var(--color-text)] shadow-[0_4px_0_var(--color-text)]">
                {copy.ask.dossierLabel}
              </a>
            </Reveal>
          </section>
        )}

        {/* DOORS (entreprises) */}
        {copy.doors && (
          <section className="flex flex-col items-center gap-[18px] px-[clamp(20px,5vw,60px)] py-[clamp(28px,5vw,42px)] text-center">
            <Reveal reduce={reduce} className="flex w-full justify-center">
              <SponsorDoors locale={locale} doors={copy.doors} />
            </Reveal>
          </section>
        )}

        {/* FORMULAIRE */}
        <section className="flex justify-center px-[clamp(20px,5vw,60px)] pb-[80px] pt-[clamp(20px,4vw,34px)]">
          <LeadForm locale={locale} form={copy.form} id="sponsor-form" />
        </section>
      </div>
    </main>
  );
}
