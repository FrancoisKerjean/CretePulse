// Wordmark "cretedirect" dessine a la main : monoline ronde, c-spirale,
// i-soleil, vague sous "direct". LA "police" de la marque.
// Source des paths : docs/design/kalimera/wordmark.html
export function Wordmark({ variant = "light", width = 128 }: {
  /** light = encre sur fond clair ; dark = creme sur fond nuit */
  variant?: "light" | "dark";
  width?: number;
}) {
  return (
    <svg
      width={width}
      height={Math.round(width * 74 / 460)}
      viewBox="0 0 460 74"
      fill="none"
      stroke={variant === "dark" ? "#FAF6EC" : "#0B3954"}
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="cretedirect"
      role="img"
    >
      {/* c : spirale ouverte (le mark) */}
      <path d="M38 18 a16 16 0 1 0 14 24 M38 26 a8.5 8.5 0 1 0 6 14" stroke={variant === "dark" ? "#00C2D4" : "#008C9E"} />
      {/* r */}
      <path d="M64 52 V30 M64 38 q4 -9 13 -9" />
      {/* e */}
      <path d="M88 41 h22 a11.5 11.5 0 1 0 -3.4 8" />
      {/* t */}
      <path d="M126 14 V44 a8 8 0 0 0 8 8 M118 28 h16" />
      {/* e */}
      <path d="M148 41 h22 a11.5 11.5 0 1 0 -3.4 8" />
      {/* d */}
      <path d="M210 12 V52 M210 41 a11.5 11.5 0 1 1 -11.5 -11.5" />
      {/* i : tige + point soleil */}
      <path d="M228 30 V52" />
      <circle cx="228" cy="15.5" r="6" fill="#FFC83D" stroke="none" />
      <path d="M228 5.5 v3 M228 22.5 v3 M218 15.5 h3 M235 15.5 h3" stroke="#FFC83D" strokeWidth="2.6" />
      {/* r */}
      <path d="M246 52 V30 M246 38 q4 -9 13 -9" />
      {/* e */}
      <path d="M270 41 h22 a11.5 11.5 0 1 0 -3.4 8" />
      {/* c */}
      <path d="M324 32 a11.5 11.5 0 1 0 0 17" />
      {/* t */}
      <path d="M340 14 V44 a8 8 0 0 0 8 8 M332 28 h16" />
      {/* vague sous "direct" */}
      <path d="M196 66 q9 -7 18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0" stroke="#00C2D4" strokeWidth="4.5" />
    </svg>
  );
}
