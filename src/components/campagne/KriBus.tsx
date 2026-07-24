// Petit bus cartoon (porte du symbol #kbus de la maquette campagne-enriched.html),
// avec une chevre qui conduit. Decoratif : aria-hidden gere par la scene parente.

type NestProps = {
  className?: string;
  style?: React.CSSProperties;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export default function KriBus({ className, style, x, y, width, height }: NestProps) {
  return (
    <svg viewBox="0 0 150 100" className={className} style={style} x={x} y={y} width={width} height={height} overflow="visible">
      <ellipse cx="75" cy="94" rx="58" ry="5" fill="#0B3954" opacity="0.12" />
      <g stroke="#0B3954" strokeWidth="3">
        <circle cx="44" cy="84" r="13" fill="#0B3954" />
        <circle cx="44" cy="84" r="5" fill="#FFF9EC" />
        <circle cx="112" cy="84" r="13" fill="#0B3954" />
        <circle cx="112" cy="84" r="5" fill="#FFF9EC" />
      </g>
      <rect x="10" y="26" width="130" height="56" rx="18" fill="#00C2D4" stroke="#0B3954" strokeWidth="4" />
      <line x1="18" y1="68" x2="132" y2="68" stroke="#FFC83D" strokeWidth="6" strokeLinecap="round" />
      <circle cx="17" cy="60" r="4.5" fill="#FFC83D" stroke="#0B3954" strokeWidth="2.5" />
      <rect x="18" y="34" width="114" height="24" rx="9" fill="#EAF7FB" stroke="#0B3954" strokeWidth="3" />
      <line x1="62" y1="34" x2="62" y2="58" stroke="#0B3954" strokeWidth="3" />
      <line x1="96" y1="34" x2="96" y2="58" stroke="#0B3954" strokeWidth="3" />
      <path d="M50 54 Q58 44 62 29" fill="none" stroke="#C98A5B" strokeWidth="6" strokeLinecap="round" />
      <circle cx="63" cy="28" r="5" fill="#E8D2AE" stroke="#0B3954" strokeWidth="2.4" />
      {/* chevre conductrice (mini) */}
      <g transform="translate(14.6,24.3) scale(0.34)">
        <path d="M44 36 C28 28 22 12 32 4 C33 15 40 24 51 30 Z" fill="#C98A5B" stroke="#0B3954" strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M76 36 C92 28 98 12 88 4 C87 15 80 24 69 30 Z" fill="#C98A5B" stroke="#0B3954" strokeWidth="2.6" strokeLinejoin="round" />
        <ellipse cx="60" cy="58" rx="27" ry="25" fill="#F5E9D2" stroke="#0B3954" strokeWidth="2.8" />
        <ellipse cx="60" cy="67" rx="15" ry="10.5" fill="#FFF9EC" />
        <circle cx="55.5" cy="66.5" r="1.5" fill="#0B3954" />
        <circle cx="64.5" cy="66.5" r="1.5" fill="#0B3954" />
        <circle cx="50" cy="55" r="3.4" fill="#0B3954" />
        <circle cx="51.2" cy="53.8" r="1.1" fill="#fff" />
        <circle cx="70" cy="55" r="3.4" fill="#0B3954" />
        <circle cx="71.2" cy="53.8" r="1.1" fill="#fff" />
        <path d="M53 72 q7 5.5 14 0" stroke="#0B3954" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
