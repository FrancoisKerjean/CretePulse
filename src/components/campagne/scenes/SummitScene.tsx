// Scene 4 (MARQUE / SOMMET) : petit village au sommet + chevre + bus + drapeau.
// Decorative (aria-hidden).
import GoatStanding from "../GoatStanding";
import KriBus from "../KriBus";

export default function SummitScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 440 220" className={className} aria-hidden style={{ width: "100%", height: "auto", maxWidth: 440, overflow: "visible" }}>
      <g stroke="#0B3954" strokeWidth="4">
        <rect x="60" y="120" width="70" height="70" fill="#FFF9EC" />
        <path d="M55 120 L95 86 L135 120 Z" fill="#ED7A5C" />
        <rect x="250" y="110" width="80" height="80" fill="#FFF9EC" />
        <path d="M244 110 L290 74 L336 110 Z" fill="#00C2D4" />
      </g>
      <rect x="86" y="146" width="20" height="44" fill="#00C2D4" stroke="#0B3954" strokeWidth="3" />
      <GoatStanding x={138} y={104} width={100} height={116} className="cmp-bob" />
      <KriBus x={300} y={118} width={118} height={78} className="cmp-bob2" />
      {/* drapeau du sommet */}
      <path d="M150 60 v22 M150 60 h34 l-8 9 8 9 h-34" fill="#FFC83D" stroke="#0B3954" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
