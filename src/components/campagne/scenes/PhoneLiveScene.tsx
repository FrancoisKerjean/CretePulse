// Scene 3 (DIRECT) : telephone "live" avec carte des bus qui bougent + chevre.
// Decorative (aria-hidden).
import GoatStanding from "../GoatStanding";

export default function PhoneLiveScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 320" className={className} aria-hidden style={{ width: "100%", height: "auto", maxWidth: 320, overflow: "visible" }}>
      <rect x="86" y="20" width="150" height="280" rx="26" fill="#0B3954" />
      <rect x="96" y="34" width="130" height="252" rx="16" fill="#CDEFF6" />
      <path d="M104 250 Q150 150 210 70" fill="none" stroke="#FFC83D" strokeWidth="9" strokeLinecap="round" />
      <circle cx="150" cy="160" r="11" fill="#00C2D4" stroke="#0B3954" strokeWidth="3" className="cmp-floaty" />
      <circle cx="120" cy="220" r="9" fill="#ED7A5C" stroke="#0B3954" strokeWidth="3" />
      <circle cx="195" cy="100" r="9" fill="#15C172" stroke="#0B3954" strokeWidth="3" />
      <rect x="104" y="44" width="60" height="14" rx="7" fill="#00C2D4" />
      <GoatStanding x={188} y={188} width={100} height={116} className="cmp-bob" />
    </svg>
  );
}
