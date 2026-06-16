"use client";
import { useEffect, useState } from "react";
import type { CampagneCopy } from "@/lib/campagne";

// Pastille "Aider" persistante : apparait apres le hero, saute vers la section CTA
// (ancre #cta), et disparait une fois le CTA visible. Layout en flux : on se base
// sur la position de l'element #cta, pas sur un pourcentage de hauteur.
export default function HelpPill({ copy }: { copy: CampagneCopy }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const cta = document.getElementById("cta");
      const scrolledPastHero = window.scrollY > window.innerHeight * 0.6;
      const ctaVisible = cta ? cta.getBoundingClientRect().top < window.innerHeight * 0.9 : false;
      const next = scrolledPastHero && !ctaVisible;
      setShow((prev) => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const jump = () => {
    document.getElementById("cta")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <button
      type="button"
      onClick={jump}
      className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border-[3px] border-[var(--color-text)] bg-sun px-6 py-2.5 text-base font-extrabold text-[var(--color-text)] shadow-[0_5px_0_var(--color-text)] transition-opacity duration-300 ${
        show ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {copy.buttons.help} ♥
    </button>
  );
}
