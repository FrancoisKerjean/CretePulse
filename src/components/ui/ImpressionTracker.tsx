"use client";

import { useEffect, useRef } from "react";

type Plausible = (event: string, opts?: { props?: Record<string, string | number> }) => void;

/**
 * Capture décisionnelle (instrumentation 13/06) : émet UNE fois un event
 * Plausible quand le bloc parent entre réellement dans le viewport (≥ 50 %).
 * Donne le dénominateur "impression" pour calculer un VRAI CTR par placement
 * (clics / impressions), au lieu des clics absolus. Le pathname est attaché
 * automatiquement par Plausible → CTR mesurable page par page.
 *
 * Rendu invisible (hauteur 0), zéro impact layout.
 */
export function ImpressionTracker({
  event,
  props,
}: {
  event: string;
  props?: Record<string, string | number>;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || fired.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !fired.current) {
            fired.current = true;
            (window as unknown as { plausible?: Plausible }).plausible?.(event, { props });
            io.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [event, props]);

  return <span ref={ref} aria-hidden className="block h-0" />;
}
