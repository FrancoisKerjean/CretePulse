// Scene HERO : terminal KTEL + bus. Decorative (aria-hidden).
import KriBus from "../KriBus";

export default function TerminalScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 430 210" className={className} aria-hidden style={{ width: "100%", height: "auto", maxWidth: 440, overflow: "visible" }}>
      <rect x="20" y="36" width="300" height="154" rx="14" fill="#FFF9EC" stroke="#0B3954" strokeWidth="5" />
      <rect x="20" y="36" width="300" height="34" rx="14" fill="#00C2D4" stroke="#0B3954" strokeWidth="5" />
      <text x="170" y="61" fontSize="19" fontWeight="800" fill="#fff" textAnchor="middle">TERMINAL KTEL</text>
      <g stroke="#0B3954" strokeWidth="4" fill="#BDEDF5">
        <rect x="44" y="94" width="64" height="80" rx="6" />
        <rect x="138" y="94" width="64" height="80" rx="6" />
        <rect x="232" y="94" width="64" height="80" rx="6" />
      </g>
      <KriBus x={300} y={118} width={120} height={80} className="cmp-bob" />
    </svg>
  );
}
