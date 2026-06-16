// Scene 2 (CARTE) : panneau de directions (Chania / Lassithi) qui balance + chevre.
// Decorative (aria-hidden).
import GoatStanding from "../GoatStanding";

export default function SignpostScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 300" className={className} aria-hidden style={{ width: "100%", height: "auto", maxWidth: 380, overflow: "visible" }}>
      <rect x="163" y="120" width="14" height="170" rx="6" fill="#0B3954" />
      <g className="cmp-sway" style={{ transformBox: "fill-box", transformOrigin: "50% 88%" }}>
        <path d="M44 70 H254 L284 95 L254 120 H44 Z" fill="#FFC83D" stroke="#0B3954" strokeWidth="5" strokeLinejoin="round" />
        <text x="64" y="102" fontSize="17" fontWeight="800" fill="#0B3954">{"CHANIA →"}</text>
        <path d="M296 140 H86 L56 165 L86 190 H296 Z" fill="#00C2D4" stroke="#0B3954" strokeWidth="5" strokeLinejoin="round" />
        <text x="126" y="172" fontSize="17" fontWeight="800" fill="#fff">{"← LASSITHI"}</text>
      </g>
      <GoatStanding x={206} y={168} width={96} height={112} className="cmp-bob" />
    </svg>
  );
}
