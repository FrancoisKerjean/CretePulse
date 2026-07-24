// Chevre kri-kri "cute" dediee a la page-campagne /projet (porte du symbol #goat
// de la maquette campagne-enriched.html). NE PAS confondre avec le KriKri.tsx
// partage du site : ce composant est local et figé pour la campagne.
// Decoratif : aria-hidden gere par la scene parente.

type NestProps = {
  className?: string;
  style?: React.CSSProperties;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export default function GoatStanding({ className, style, x, y, width, height }: NestProps) {
  return (
    <svg viewBox="0 0 130 150" className={className} style={style} x={x} y={y} width={width} height={height} overflow="visible">
      {/* pattes arriere */}
      <g stroke="#0B3954" strokeWidth="3">
        <rect x="44" y="106" width="12" height="36" rx="6" fill="#D8BE96" />
        <rect x="74" y="106" width="12" height="36" rx="6" fill="#D8BE96" />
        <rect x="44" y="136" width="12" height="9" rx="3" fill="#0B3954" />
        <rect x="74" y="136" width="12" height="9" rx="3" fill="#0B3954" />
      </g>
      {/* queue */}
      <path d="M99 96 q14 -3 12 -17 q-3 10 -12 8 Z" fill="#E8D2AE" stroke="#0B3954" strokeWidth="2.5" strokeLinejoin="round" />
      {/* corps */}
      <ellipse cx="64" cy="98" rx="41" ry="31" fill="#F5E9D2" stroke="#0B3954" strokeWidth="3.2" />
      {/* pattes avant */}
      <g stroke="#0B3954" strokeWidth="3">
        <rect x="50" y="116" width="12" height="30" rx="6" fill="#E8D2AE" />
        <rect x="68" y="116" width="12" height="30" rx="6" fill="#E8D2AE" />
        <rect x="50" y="140" width="12" height="9" rx="3" fill="#0B3954" />
        <rect x="68" y="140" width="12" height="9" rx="3" fill="#0B3954" />
      </g>
      {/* ventre clair */}
      <path d="M48 92 q16 15 32 0 q-4 17 -16 17 q-12 0 -16 -17 Z" fill="#FFF9EC" opacity=".75" />
      {/* oreilles */}
      <ellipse cx="32" cy="54" rx="13" ry="7" transform="rotate(-24 32 54)" fill="#D8BE96" stroke="#0B3954" strokeWidth="3" />
      <ellipse cx="96" cy="54" rx="13" ry="7" transform="rotate(24 96 54)" fill="#D8BE96" stroke="#0B3954" strokeWidth="3" />
      {/* cornes */}
      <g fill="#CBA96B" stroke="#0B3954" strokeWidth="3" strokeLinejoin="round">
        <path d="M52 38 C42 24 36 13 33 5 C44 11 54 24 60 35 Z" />
        <path d="M76 38 C86 24 92 13 95 5 C84 11 74 24 68 35 Z" />
      </g>
      {/* anneaux des cornes */}
      <g stroke="#0B3954" strokeWidth="1.5" opacity=".4" fill="none">
        <path d="M46 28 q4 -2 7 0 M42 19 q4 -2 7 0 M82 28 q-4 -2 -7 0 M86 19 q-4 -2 -7 0" />
      </g>
      {/* tete */}
      <path d="M64 32 C42 32 36 50 38 64 C40 82 52 92 64 92 C76 92 88 82 90 64 C92 50 86 32 64 32 Z" fill="#F5E9D2" stroke="#0B3954" strokeWidth="3.2" />
      {/* museau */}
      <ellipse cx="64" cy="74" rx="16" ry="12" fill="#FFF9EC" />
      <circle cx="59" cy="73" r="1.7" fill="#0B3954" />
      <circle cx="69" cy="73" r="1.7" fill="#0B3954" />
      <path d="M57 80 q7 5 14 0" stroke="#0B3954" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      {/* barbiche */}
      <path d="M59 88 q5 13 5 17 q0 -4 5 -17 Z" fill="#E8D2AE" stroke="#0B3954" strokeWidth="2.4" strokeLinejoin="round" />
      {/* joues roses */}
      <circle cx="47" cy="68" r="5" fill="#ED7A5C" opacity=".3" />
      <circle cx="81" cy="68" r="5" fill="#ED7A5C" opacity=".3" />
      {/* yeux */}
      <circle cx="54" cy="58" r="5" fill="#0B3954" />
      <circle cx="56" cy="56" r="1.9" fill="#fff" />
      <circle cx="74" cy="58" r="5" fill="#0B3954" />
      <circle cx="76" cy="56" r="1.9" fill="#fff" />
      {/* petite touffe sur le front */}
      <path d="M58 33 q6 -7 12 0 q-6 -3 -12 0 Z" fill="#E8D2AE" stroke="#0B3954" strokeWidth="2" />
    </svg>
  );
}
