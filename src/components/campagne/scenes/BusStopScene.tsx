// Scene 1 (PROBLEME) : arret de bus + chevres qui attendent + vieux horaire papier
// (OPAPIO en grec) + point d'interrogation flottant. Decorative (aria-hidden).
import GoatStanding from "../GoatStanding";

export default function BusStopScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 300" className={className} aria-hidden style={{ width: "100%", height: "auto", maxWidth: 380, overflow: "visible" }}>
      {/* poteau */}
      <rect x="150" y="120" width="13" height="170" rx="6" fill="#0B3954" />
      {/* vieux papier d'horaires (penche) */}
      <g transform="rotate(-5 95 180)">
        <rect x="64" y="156" width="60" height="80" rx="4" fill="#FBF3DD" stroke="#0B3954" strokeWidth="3" />
        <g stroke="#9aa6ad" strokeWidth="3" strokeLinecap="round">
          <path d="M72 172 h40 M72 182 h44 M72 192 h30 M72 202 h40 M72 212 h26" />
        </g>
        <text x="74" y="150" fontSize="9" fontWeight="800" fill="#0B3954">{"ΩΡΑΡΙΟ"}</text>
      </g>
      {/* abri-bus (qui balance) */}
      <g className="cmp-sway" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        <rect x="132" y="26" width="118" height="80" rx="15" fill="#00C2D4" stroke="#0B3954" strokeWidth="5" />
        <g transform="translate(158,44)" stroke="#0B3954" strokeWidth="4" fill="#FFF9EC" strokeLinejoin="round">
          <rect x="0" y="0" width="64" height="38" rx="9" />
          <line x1="0" y1="13" x2="64" y2="13" />
          <circle cx="15" cy="42" r="6" fill="#0B3954" />
          <circle cx="49" cy="42" r="6" fill="#0B3954" />
        </g>
      </g>
      {/* chevres qui attendent */}
      <GoatStanding x={190} y={160} width={100} height={116} className="cmp-bob" />
      <GoatStanding x={262} y={178} width={82} height={95} className="cmp-bob2" />
      {/* point d'interrogation flottant */}
      <g className="cmp-floaty" transform="translate(250,150)">
        <circle cx="0" cy="0" r="15" fill="#fff" stroke="#0B3954" strokeWidth="3" />
        <text x="0" y="7" fontSize="18" fontWeight="800" fill="#ED7A5C" textAnchor="middle">?</text>
      </g>
    </svg>
  );
}
