import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// OG images charte "donnees vivantes" : creme + bandeau aegean + pastille LIVE
// + filet accent par type. Chaque partage Facebook est une pub du design.
// Spec : docs/superpowers/specs/2026-06-11-ui-live-data-redesign-design.md
const CREAM = "#F7F4F0";
const AEGEAN = "#1B4965";
const INK = "#1A1A2E";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Crete Direct";
  const subtitle = searchParams.get("subtitle") || "The practical companion to Crete - live data";
  const type = searchParams.get("type") || "default"; // beach, weather, news, event, guide

  // Accent (filet bas + pastille type) par type de contenu
  const ACCENTS: Record<string, string> = {
    default: "#B85C38",
    beach: "#2D6A8F",
    weather: "#2D6A8F",
    news: "#B85C38",
    event: "#B85C38",
    guide: "#5F7A3E",
    compare: "#B85C38",
    transport: "#1B4965",
  };
  const accent = ACCENTS[type] || ACCENTS.default;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: CREAM,
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {/* Bandeau superieur aegean : logo + pastille LIVE */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: AEGEAN,
            padding: "28px 60px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "30px", fontWeight: 800, color: "#FFFFFF", fontFamily: "system-ui, sans-serif", letterSpacing: "-0.5px" }}>CRETE</span>
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", backgroundColor: "#B85C38" }} />
            <span style={{ fontSize: "30px", fontWeight: 800, color: "#E8C9A0", fontFamily: "system-ui, sans-serif", letterSpacing: "-0.5px" }}>DIRECT</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#34D399" }} />
            <span style={{ fontSize: "20px", color: "rgba(255,255,255,0.85)", fontFamily: "ui-monospace, monospace", letterSpacing: "2px" }}>LIVE</span>
          </div>
        </div>

        {/* Corps creme : titre serif + sous-titre */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: "40px 60px",
            gap: "20px",
          }}
        >
          <h1
            style={{
              fontSize: title.length > 40 ? "52px" : "64px",
              fontWeight: 700,
              color: INK,
              lineHeight: 1.08,
              margin: 0,
              maxWidth: "1020px",
            }}
          >
            {title}
          </h1>
          {subtitle && subtitle !== title && (
            <p
              style={{
                fontSize: "26px",
                color: "#6B7280",
                margin: 0,
                maxWidth: "860px",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Pied : URL + filet accent */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", padding: "0 60px 26px" }}>
            <span style={{ fontSize: "20px", color: "#94A3B8", fontFamily: "ui-monospace, monospace" }}>crete.direct</span>
          </div>
          <div style={{ display: "flex", height: "10px", backgroundColor: accent, width: "100%" }} />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
