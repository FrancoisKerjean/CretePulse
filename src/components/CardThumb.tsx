// Vignette unifiee : ratio fixe + traitement photo signature Kalimera
// (voile lagon vers nuit + grain) + fallback abstraction lumineuse.
// Spec : docs/superpowers/specs/2026-06-11-brand-da-kalimera-design.md
import Image from "next/image";
import { AbstractFallback } from "./AbstractFallback";

const KIND: Record<string, "sea" | "land" | "news"> = {
  news: "news", guide: "land", daily: "sea", default: "sea",
};

export function CardThumb({ src, alt, category = "default", className = "" }: {
  src: string | null;
  alt: string;
  category?: string;
  className?: string;
}) {
  return (
    <div className={`relative aspect-[16/10] overflow-hidden ${className}`}>
      {src ? (
        <>
          <Image src={src} alt={alt} fill className="object-cover saturate-[1.08]" sizes="(max-width: 768px) 100vw, 33vw" />
          <div className="absolute inset-0 bg-gradient-to-b from-lagoon/5 via-transparent to-night/40 pointer-events-none" />
          <svg className="absolute inset-0 w-full h-full opacity-25 mix-blend-overlay pointer-events-none" aria-hidden>
            <filter id="ktreat"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" /></filter>
            <rect width="100%" height="100%" filter="url(#ktreat)" />
          </svg>
        </>
      ) : (
        <AbstractFallback kind={KIND[category] ?? "sea"} />
      )}
    </div>
  );
}
