// Le kri-kri : la mascotte discrete de crete.direct (chevre sauvage de Crete).
// Usage : etats vides, 404 (yeux-spirale, clin d'oeil au mark), alertes.
// Jamais hero ni nav. Paths : docs/design/kalimera/krikri.html
type Mood = "hello" | "alert" | "empty" | "lost";

function Base({ id }: { id: string }) {
  return (
    <g id={id}>
      {/* cornes arquees (signature kri-kri) */}
      <path d="M44 36 C28 28 22 12 32 4 C33 15 40 24 51 30 Z" fill="#C98A5B" stroke="#0B3954" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M76 36 C92 28 98 12 88 4 C87 15 80 24 69 30 Z" fill="#C98A5B" stroke="#0B3954" strokeWidth="2.6" strokeLinejoin="round" />
      {/* oreilles */}
      <ellipse cx="33" cy="50" rx="9" ry="5.5" transform="rotate(-22 33 50)" fill="#E8D2AE" stroke="#0B3954" strokeWidth="2.6" />
      <ellipse cx="87" cy="50" rx="9" ry="5.5" transform="rotate(22 87 50)" fill="#E8D2AE" stroke="#0B3954" strokeWidth="2.6" />
      {/* tete */}
      <ellipse cx="60" cy="58" rx="27" ry="25" fill="#F5E9D2" stroke="#0B3954" strokeWidth="2.8" />
      {/* museau */}
      <ellipse cx="60" cy="67" rx="15" ry="10.5" fill="#FFF9EC" />
      {/* narines */}
      <circle cx="55.5" cy="66.5" r="1.5" fill="#0B3954" />
      <circle cx="64.5" cy="66.5" r="1.5" fill="#0B3954" />
      {/* barbiche */}
      <path d="M56 82 C57 89 63 89 64 82 C62 84 58 84 56 82 Z" fill="#E8D2AE" stroke="#0B3954" strokeWidth="2.4" strokeLinejoin="round" />
    </g>
  );
}

export function KriKri({ mood = "hello", className = "" }: { mood?: Mood; className?: string }) {
  const baseId = `kk-base-${mood}`;
  return (
    <svg viewBox="0 0 120 96" className={className} role="img" aria-label="kri-kri">
      <g transform="translate(0,6)">
        {mood === "hello" && (
          <>
            <path d="M14 22 v6 M10 28 h-6 M17 30 l-4 4" stroke="#FFC83D" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="20" cy="20" r="7" fill="#FFC83D" />
            <Base id={baseId} />
            <circle cx="50" cy="55" r="3.4" fill="#0B3954" /><circle cx="51.2" cy="53.8" r="1.1" fill="#fff" />
            <circle cx="70" cy="55" r="3.4" fill="#0B3954" /><circle cx="71.2" cy="53.8" r="1.1" fill="#fff" />
            <path d="M53 72 q7 5.5 14 0" stroke="#0B3954" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          </>
        )}
        {mood === "alert" && (
          <>
            <g transform="rotate(-6 60 58)"><Base id={baseId} /></g>
            <circle cx="50" cy="55" r="3.6" fill="#0B3954" /><circle cx="51.4" cy="53.6" r="1.1" fill="#fff" />
            <circle cx="70" cy="55" r="3.6" fill="#0B3954" /><circle cx="71.4" cy="53.6" r="1.1" fill="#fff" />
            <path d="M44 47 l9 -3 M76 47 l-9 -3" stroke="#0B3954" strokeWidth="2.6" strokeLinecap="round" />
            <ellipse cx="60" cy="73" rx="4" ry="5" fill="#0B3954" />
            <g transform="translate(96,14)">
              <circle r="13" fill="#FFC83D" stroke="#0B3954" strokeWidth="2.6" />
              <path d="M0 -6 v7" stroke="#0B3954" strokeWidth="3.4" strokeLinecap="round" />
              <circle cy="5.5" r="1.9" fill="#0B3954" />
            </g>
          </>
        )}
        {mood === "empty" && (
          <>
            <Base id={baseId} />
            <circle cx="52" cy="55" r="3.4" fill="#0B3954" /><circle cx="53.4" cy="54" r="1.1" fill="#fff" />
            <circle cx="72" cy="55" r="3.4" fill="#0B3954" /><circle cx="73.4" cy="54" r="1.1" fill="#fff" />
            <path d="M54 73 q6 3.5 12 0" stroke="#0B3954" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <text x="97" y="34" fontSize="30" fontWeight="800" fill="#ED7A5C" fontFamily="var(--font-heading), 'Comfortaa', sans-serif">?</text>
          </>
        )}
        {mood === "lost" && (
          <>
            <g transform="rotate(5 60 58)"><Base id={baseId} /></g>
            <path d="M50 55 a4 4 0 1 1 4 4 a2.6 2.6 0 0 1 -2.6 -2.6 a1.4 1.4 0 0 1 1.4 -1.4" stroke="#0B3954" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M70 55 a4 4 0 1 1 4 4 a2.6 2.6 0 0 1 -2.6 -2.6 a1.4 1.4 0 0 1 1.4 -1.4" stroke="#0B3954" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M54 74 q3 -3 6 0 t6 0" stroke="#0B3954" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <path d="M88 20 q4 -8 12 -6 M92 28 q6 -3 10 1" stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          </>
        )}
      </g>
    </svg>
  );
}
