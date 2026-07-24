"use client";
import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";

// Apparition au scroll, no-JS safe + reduced-motion aware.
// - Avant hydratation / JS off : contenu visible (hidden ne devient vrai qu'apres mounted).
// - reduced-motion : fade sans translate.
export default function Reveal({
  children,
  reduce = false,
  className,
  amount = 0.2,
  delay = 0,
}: {
  children: React.ReactNode;
  reduce?: boolean;
  className?: string;
  amount?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const inView = useInView(ref, { once: true, amount });
  const hidden = mounted && !inView;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden && !reduce ? "translateY(28px)" : "none",
        transition: `opacity 700ms ease-out ${delay}ms, transform 700ms ease-out ${delay}ms`,
        willChange: hidden ? "opacity, transform" : undefined,
      }}
    >
      {children}
    </div>
  );
}
