// Decor de fond de la page-campagne /projet (porte de campagne-enriched.html) :
// montagnes / collines / soleil (SVG absolus), nuages qui derivent, et la ROUTE
// qui serpente derriere le contenu (preserveAspectRatio="none", etiree sur toute
// la hauteur du parent). 100% decoratif (aria-hidden), pointer-events: none.
// Le ciel (gradient) est applique par le parent (ParcoursClient) en background CSS.

function Cloud() {
  return (
    <g fill="#fff" stroke="#0B3954" strokeWidth="4">
      <path d="M30 55 q-22 0 -22-20 q0-18 22-16 q4-18 28-16 q18-14 38 4 q26-6 30 18 q18 2 14 18 q-4 12 -22 12 Z" />
    </g>
  );
}

export default function RoadDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* montagnes deco */}
      <svg className="absolute left-0 w-full" style={{ top: "26%", height: "30%" }} viewBox="0 0 1200 1100" preserveAspectRatio="none">
        <path d="M0 760 L260 320 L520 680 L640 120 L840 540 L1040 260 L1200 520 L1200 1100 L0 1100 Z" fill="#7FB8CE" opacity=".9" />
        <path d="M520 680 L640 120 L848 640 Z" fill="#5C9DBA" opacity=".9" />
        <path d="M588 320 L640 120 L700 320 L674 300 L648 334 L622 300 L600 332 Z" fill="#fff" />
      </svg>
      {/* collines deco */}
      <svg className="absolute left-0 w-full" style={{ bottom: 0, height: "22%" }} viewBox="0 0 1200 900" preserveAspectRatio="none">
        <path d="M0 300 L260 130 L520 330 L820 110 L1080 350 L1200 250 L1200 900 L0 900 Z" fill="#9FCBA8" />
        <path d="M0 560 L360 380 L720 600 L1040 400 L1200 520 L1200 900 L0 900 Z" fill="#7FB58E" />
      </svg>
      {/* soleil */}
      <svg className="absolute" style={{ top: "30%", right: "4%", width: "13%", height: "auto" }} viewBox="0 0 160 160">
        <g stroke="#0B3954" strokeWidth="6" strokeLinecap="round" transform="translate(80,80)">
          <path d="M0 -64 v18 M0 46 v18 M-64 0 h18 M46 0 h18 M-46 -46 l12 12 M34 34 l12 12 M46 -46 l-12 12 M-46 46 l12 -12" />
        </g>
        <circle cx="80" cy="80" r="44" fill="#FFC83D" stroke="#0B3954" strokeWidth="6" />
      </svg>

      {/* ROUTE decorative qui serpente (derriere les cards) */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 5000" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cmp-rd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5A623" />
            <stop offset="100%" stopColor="#FFC83D" />
          </linearGradient>
        </defs>
        <path
          d="M600 250 C900 520 1040 760 980 1050 C900 1320 220 1420 240 1720 C265 2050 1010 2120 1000 2440 C992 2720 720 2900 600 3120 C480 3340 250 3460 270 3760 C295 4080 1000 4140 980 4460 C965 4680 720 4780 600 4900"
          fill="none"
          stroke="#0B3954"
          strokeWidth="42"
          strokeLinecap="round"
        />
        <path
          d="M600 250 C900 520 1040 760 980 1050 C900 1320 220 1420 240 1720 C265 2050 1010 2120 1000 2440 C992 2720 720 2900 600 3120 C480 3340 250 3460 270 3760 C295 4080 1000 4140 980 4460 C965 4680 720 4780 600 4900"
          fill="none"
          stroke="url(#cmp-rd)"
          strokeWidth="30"
          strokeLinecap="round"
        />
        <path
          d="M600 250 C900 520 1040 760 980 1050 C900 1320 220 1420 240 1720 C265 2050 1010 2120 1000 2440 C992 2720 720 2900 600 3120 C480 3340 250 3460 270 3760 C295 4080 1000 4140 980 4460 C965 4680 720 4780 600 4900"
          fill="none"
          stroke="#fff"
          strokeWidth="4.5"
          strokeDasharray="22 28"
          opacity=".85"
        />
        <g transform="translate(600,4900)">
          <path d="M0 8 C-24 -32 -32 -50 -32 -66 A32 32 0 1 1 32 -66 C32 -50 24 -32 0 8 Z" fill="#ED7A5C" stroke="#0B3954" strokeWidth="6" strokeLinejoin="round" />
          <circle cx="0" cy="-66" r="12" fill="#fff" stroke="#0B3954" strokeWidth="5" />
        </g>
      </svg>

      {/* nuages qui derivent (la position top est en px ; ils derivent en X via CSS) */}
      <svg className="cmp-cloud absolute" style={{ top: 60, left: 0, width: 150 }} viewBox="0 0 170 70">
        <Cloud />
      </svg>
      <svg className="cmp-cloud-b absolute opacity-80" style={{ top: 150, left: 0, width: 120 }} viewBox="0 0 170 70">
        <Cloud />
      </svg>
    </div>
  );
}
