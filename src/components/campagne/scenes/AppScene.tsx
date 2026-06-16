// Scene 5 (DEMAIN) : appli (telephone flottant avec coche verte) + chevre.
// Decorative (aria-hidden).
import GoatStanding from "../GoatStanding";

export default function AppScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 300" className={className} aria-hidden style={{ width: "100%", height: "auto", maxWidth: 300, overflow: "visible" }}>
      <rect x="80" y="20" width="140" height="262" rx="26" fill="#0B3954" className="cmp-floaty" />
      <rect x="90" y="34" width="120" height="234" rx="15" fill="#FFF9EC" />
      <circle cx="150" cy="116" r="40" fill="#00C2D4" stroke="#0B3954" strokeWidth="4" />
      <path d="M132 116 l12 12 24 -26" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="108" y="178" width="84" height="13" rx="6" fill="#E8D2AE" />
      <rect x="108" y="200" width="60" height="13" rx="6" fill="#E8D2AE" />
      <GoatStanding x={0} y={186} width={104} height={120} className="cmp-bob" />
    </svg>
  );
}
