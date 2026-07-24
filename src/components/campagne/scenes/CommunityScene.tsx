// Scene 6 (AIDE) : communaute (bus + groupe de 3 chevres + coeur flottant).
// Decorative (aria-hidden).
import GoatStanding from "../GoatStanding";
import KriBus from "../KriBus";

export default function CommunityScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 380 280" className={className} aria-hidden style={{ width: "100%", height: "auto", maxWidth: 380, overflow: "visible" }}>
      <KriBus x={120} y={56} width={150} height={100} />
      <GoatStanding x={16} y={150} width={104} height={120} className="cmp-bob" />
      <GoatStanding x={118} y={166} width={88} height={102} className="cmp-bob2" />
      <GoatStanding x={214} y={150} width={104} height={120} className="cmp-bob3" />
      <g className="cmp-floaty">
        <path d="M300 64 c0-14 22-14 22 0 c0 12 -22 24 -22 24 c0-0 -22-12 -22-24 c0-14 22-14 22 0 Z" fill="#ED7A5C" stroke="#0B3954" strokeWidth="3" />
      </g>
    </svg>
  );
}
