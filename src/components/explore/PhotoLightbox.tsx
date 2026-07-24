"use client";

// Lightbox pour la galerie photo des fiches /explore.
// Decouplage hero <-> galerie via un CustomEvent window : chaque PhotoTrigger
// emet "place:open-lightbox" avec son index, la LightboxModal (montee une fois)
// ecoute et gere l'etat d'ouverture + la navigation.

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const EVENT = "place:open-lightbox";

export function PhotoTrigger({
  index,
  className,
  ariaLabel,
  children,
}: {
  index: number;
  className?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() =>
        window.dispatchEvent(new CustomEvent<number>(EVENT, { detail: index }))
      }
      className={className}
    >
      {children}
    </button>
  );
}

export function LightboxModal({
  photos,
  name,
}: {
  photos: string[];
  name: string;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const total = photos.length;

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(
    () => setIndex((i) => (i === null ? null : (i - 1 + total) % total)),
    [total],
  );
  const next = useCallback(
    () => setIndex((i) => (i === null ? null : (i + 1) % total)),
    [total],
  );

  // ouverture via CustomEvent emis par les PhotoTrigger
  useEffect(() => {
    const onOpen = (e: Event) => {
      const i = (e as CustomEvent<number>).detail;
      if (typeof i === "number" && i >= 0 && i < total) setIndex(i);
    };
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, [total]);

  // clavier + lock du scroll quand ouvert
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, close, prev, next]);

  const open = index !== null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={name}
        >
          {/* Fermer */}
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Precedent */}
          {total > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous"
              className="absolute left-2 md:left-4 z-10 rounded-full bg-white/10 p-2 md:p-3 text-white hover:bg-white/20 transition"
            >
              <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          )}

          {/* Image */}
          <motion.img
            key={index}
            src={photos[index!]}
            alt={name}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[94vw] object-contain rounded-lg shadow-float select-none"
          />

          {/* Suivant */}
          {total > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next"
              className="absolute right-2 md:right-4 z-10 rounded-full bg-white/10 p-2 md:p-3 text-white hover:bg-white/20 transition"
            >
              <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          )}

          {/* Compteur */}
          {total > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 rounded-full bg-black/50 px-3 py-1 text-sm text-white/90 tabular-nums">
              {index! + 1} / {total}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
