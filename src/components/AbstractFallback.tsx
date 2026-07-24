// Fallback "abstraction lumineuse" : gradients organiques par categorie + grain.
// Remplace tous les fallbacks gradient lineaires. Jamais figuratif.
// Spec : docs/superpowers/specs/2026-06-11-brand-da-kalimera-design.md
const COMPS: Record<string, string> = {
  sea: `radial-gradient(90px 70px at 78% 22%, rgba(255,200,61,.9), rgba(255,200,61,0) 70%),
        radial-gradient(200px 140px at 20% 85%, rgba(11,94,120,.85), rgba(11,94,120,0) 75%),
        linear-gradient(165deg, #BDEDF5, #00C2D4 70%)`,
  land: `radial-gradient(110px 80px at 24% 20%, rgba(237,122,92,.9), rgba(237,122,92,0) 72%),
         radial-gradient(240px 150px at 75% 80%, rgba(124,154,83,.9), rgba(124,154,83,0) 78%),
         linear-gradient(160deg, #FFF3D6, #F2E0B4 70%)`,
  news: `radial-gradient(90px 70px at 70% 25%, rgba(0,194,212,.85), rgba(0,194,212,0) 70%),
         radial-gradient(200px 130px at 25% 85%, rgba(7,55,74,.8), rgba(7,55,74,0) 75%),
         linear-gradient(165deg, #DFF7FA, #8FE0EC 70%)`,
};

export function AbstractFallback({ kind = "sea", className = "", children }: {
  kind?: "sea" | "land" | "news";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`absolute inset-0 ${className}`} style={{ background: COMPS[kind] }}>
      <svg className="absolute inset-0 w-full h-full opacity-30 mix-blend-overlay" aria-hidden>
        <filter id={`kgrain-${kind}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" /></filter>
        <rect width="100%" height="100%" filter={`url(#kgrain-${kind})`} />
      </svg>
      {children}
    </div>
  );
}
