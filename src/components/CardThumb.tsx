// Vignette unifiee : ratio fixe + voile teintant aegean qui masque
// l'heterogeneite des photos scrapees + fallback gradient par categorie.
// Spec : docs/superpowers/specs/2026-06-11-ui-live-data-redesign-design.md
import Image from "next/image";

const FALLBACK_GRADIENTS: Record<string, string> = {
  news: "from-aegean to-aegean-light",
  guide: "from-olive to-olive-light",
  daily: "from-terra to-terra-light",
  default: "from-aegean-light to-olive-light",
};

export function CardThumb({ src, alt, category = "default", className = "" }: {
  src: string | null;
  alt: string;
  category?: string;
  className?: string;
}) {
  return (
    <div className={`relative aspect-[16/10] overflow-hidden rounded-t-xl ${className}`}>
      {src ? (
        <>
          <Image src={src} alt={alt} fill className="object-cover saturate-[.88]" sizes="(max-width: 768px) 100vw, 33vw" />
          <div className="absolute inset-0 bg-aegean/10 mix-blend-multiply pointer-events-none" />
        </>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${FALLBACK_GRADIENTS[category] ?? FALLBACK_GRADIENTS.default}`} />
      )}
    </div>
  );
}
