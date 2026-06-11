import Link from "next/link";

// 404 racine (URLs hors segment locale) : rend son propre <html>, sans
// globals.css, donc styles inline + kri-kri "lost" en SVG autonome.
// Paths : docs/design/kalimera/krikri.html (yeux-spirale, clin d'oeil au mark)
function KriKriLost() {
  return (
    <svg width="140" height="112" viewBox="0 0 120 96" role="img" aria-label="kri-kri">
      <g transform="translate(0,6)">
        <g transform="rotate(5 60 58)">
          <path d="M44 36 C28 28 22 12 32 4 C33 15 40 24 51 30 Z" fill="#C98A5B" stroke="#0B3954" strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M76 36 C92 28 98 12 88 4 C87 15 80 24 69 30 Z" fill="#C98A5B" stroke="#0B3954" strokeWidth="2.6" strokeLinejoin="round" />
          <ellipse cx="33" cy="50" rx="9" ry="5.5" transform="rotate(-22 33 50)" fill="#E8D2AE" stroke="#0B3954" strokeWidth="2.6" />
          <ellipse cx="87" cy="50" rx="9" ry="5.5" transform="rotate(22 87 50)" fill="#E8D2AE" stroke="#0B3954" strokeWidth="2.6" />
          <ellipse cx="60" cy="58" rx="27" ry="25" fill="#F5E9D2" stroke="#0B3954" strokeWidth="2.8" />
          <ellipse cx="60" cy="67" rx="15" ry="10.5" fill="#FFF9EC" />
          <circle cx="55.5" cy="66.5" r="1.5" fill="#0B3954" />
          <circle cx="64.5" cy="66.5" r="1.5" fill="#0B3954" />
          <path d="M56 82 C57 89 63 89 64 82 C62 84 58 84 56 82 Z" fill="#E8D2AE" stroke="#0B3954" strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <path d="M50 55 a4 4 0 1 1 4 4 a2.6 2.6 0 0 1 -2.6 -2.6 a1.4 1.4 0 0 1 1.4 -1.4" stroke="#0B3954" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M70 55 a4 4 0 1 1 4 4 a2.6 2.6 0 0 1 -2.6 -2.6 a1.4 1.4 0 0 1 1.4 -1.4" stroke="#0B3954" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M54 74 q3 -3 6 0 t6 0" stroke="#0B3954" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M88 20 q4 -8 12 -6 M92 28 q6 -3 10 1" stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

export default function RootNotFound() {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F6FBFC", color: "#0B3954", margin: 0 }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <KriKriLost />
            <p style={{ fontSize: "72px", fontWeight: 800, color: "rgba(11, 94, 120, 0.2)", margin: "0 0 8px", fontVariantNumeric: "tabular-nums" }}>404</p>
            <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "12px" }}>Oops, lost! · kri-kri took a wrong turn</h1>
            <p style={{ color: "#5C7886", marginBottom: "32px" }}>The page you are looking for does not exist.</p>
            <Link href="/en" style={{ display: "inline-block", background: "#FFC83D", color: "#0B3954", padding: "13px 26px", borderRadius: "999px", textDecoration: "none", fontWeight: 800, fontSize: "14px" }}>
              Go to Crete Direct
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
