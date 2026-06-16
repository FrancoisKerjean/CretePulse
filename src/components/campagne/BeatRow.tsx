"use client";
import type { Beat, BeatConfig } from "@/lib/campagne";
import Card from "./Card";
import Reveal from "./Reveal";
import type { ComponentType } from "react";
import TerminalScene from "./scenes/TerminalScene";
import BusStopScene from "./scenes/BusStopScene";
import SignpostScene from "./scenes/SignpostScene";
import PhoneLiveScene from "./scenes/PhoneLiveScene";
import SummitScene from "./scenes/SummitScene";
import AppScene from "./scenes/AppScene";
import CommunityScene from "./scenes/CommunityScene";

export const SCENES: Record<BeatConfig["scene"], ComponentType<{ className?: string }>> = {
  terminal: TerminalScene,
  busStop: BusStopScene,
  signpost: SignpostScene,
  phoneLive: PhoneLiveScene,
  summit: SummitScene,
  app: AppScene,
  community: CommunityScene,
};

// Rangee narrative : scene illustree + card cartoon. Desktop = grille 2 colonnes
// (alternee via flip), mobile = 1 colonne (scene au-dessus, card en dessous).
// Layout en flux : aucun positionnement absolu -> zero chevauchement possible.
export default function BeatRow({ beat, config, reduce }: { beat: Beat; config: BeatConfig; reduce: boolean }) {
  const Scene = SCENES[config.scene];

  return (
    <section className="flex w-full items-center justify-center px-[clamp(20px,5vw,60px)] py-[clamp(34px,5vw,46px)]">
      <div className="grid w-full max-w-[1100px] grid-cols-1 items-center gap-[clamp(24px,5vw,50px)] md:grid-cols-2">
        {/* SCENE : sur mobile toujours en premier (ordre source) ; sur desktop a
            gauche (defaut) ou a droite (flip via md:order-2). */}
        <Reveal
          reduce={reduce}
          className={`flex items-center justify-center ${config.flip ? "md:order-2" : "md:order-1"}`}
        >
          <Scene />
        </Reveal>
        {/* CARD */}
        <Reveal
          reduce={reduce}
          delay={120}
          className={`flex justify-center ${config.flip ? "md:order-1" : "md:order-2"}`}
        >
          <Card
            kicker={beat.kicker}
            kickerVariant={config.kickerVariant}
            tag={config.tag}
            title={beat.title}
            sub={beat.sub}
            reduce={reduce}
          />
        </Reveal>
      </div>
    </section>
  );
}
