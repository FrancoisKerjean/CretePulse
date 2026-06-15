"use client";
import { useEffect, useState } from "react";
import type { CampagneCopy } from "@/lib/campagne";

export default function HelpPill({ ctaTop, copy }: { ctaTop: number; copy: CampagneCopy }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const p = window.scrollY / (document.body.scrollHeight - window.innerHeight || 1);
      const next = p > 0.05 && p < (ctaTop / 100) - 0.05;
      setShow(prev => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ctaTop]);

  const jump = () => {
    const top = (ctaTop / 100) * document.body.scrollHeight;
    window.scrollTo({ top, behavior: "smooth" });
  };
  const label = copy.buttons.help;

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
