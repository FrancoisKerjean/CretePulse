"use client";
import { useEffect, useState } from "react";
import type { CampagneCopy } from "@/lib/campagne";

export default function HelpPill({ ctaTop, copy }: { locale: string; ctaTop: number; copy: CampagneCopy }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const p = window.scrollY / (document.body.scrollHeight - window.innerHeight || 1);
      // visible sauf tout en haut et au niveau du CTA
      setShow(p > 0.05 && p < ctaTop / 100 - 0.05);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ctaTop]);

  const jump = () => {
    const top = (ctaTop / 100) * document.body.scrollHeight;
    window.scrollTo({ top, behavior: "smooth" });
  };
  // label derive de la copie pour rester localise sans prop supplementaire (FR "Aider" / EN "Help")
  const label = copy.buttons.share === "Share" ? "Help" : "Aider";

  return (
    <button
      type="button"
      onClick={jump}
      className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border-[3px] border-[var(--color-text)] bg-sun px-6 py-2.5 text-base font-extrabold text-[var(--color-text)] shadow-[0_5px_0_var(--color-text)] transition-opacity duration-300 ${show ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      {label} ♥
    </button>
  );
}
