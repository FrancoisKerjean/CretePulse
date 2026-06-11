import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// OG images charte Kalimera : foam + bandeau nuit avec le wordmark dessine
// + pastille LIVE + filet lagon. Chaque partage est une pub du design.
// Spec : docs/superpowers/specs/2026-06-11-brand-da-kalimera-design.md
const FOAM = "#F6FBFC";
const NIGHT = "#07374A";
const INK = "#0B3954";
const LAGOON = "#00C2D4";
const SUN = "#FFC83D";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Crete Direct";
  const subtitle = searchParams.get("subtitle") || "The practical companion to Crete · live data";
  const type = searchParams.get("type") || "default"; // beach, weather, news, event, guide

  // Accent (pastille basse) par type de contenu ; filet bas toujours lagon.
  const ACCENTS: Record<string, string> = {
    default: LAGOON,
    beach: LAGOON,
    weather: LAGOON,
    news: "#ED7A5C",
    event: SUN,
    guide: "#7C9A53",
    compare: "#ED7A5C",
    transport: "#0B5E78",
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
          backgroundColor: FOAM,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Bandeau nuit : wordmark dessine + pastille LIVE */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: NIGHT,
            padding: "26px 60px",
          }}
        >
          <svg
            width="276"
            height="44"
            viewBox="0 0 460 74"
            fill="none"
            stroke="#FAF6EC"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M38 18 a16 16 0 1 0 14 24 M38 26 a8.5 8.5 0 1 0 6 14" stroke={LAGOON} />
            <path d="M64 52 V30 M64 38 q4 -9 13 -9" />
            <path d="M88 41 h22 a11.5 11.5 0 1 0 -3.4 8" />
            <path d="M126 14 V44 a8 8 0 0 0 8 8 M118 28 h16" />
            <path d="M148 41 h22 a11.5 11.5 0 1 0 -3.4 8" />
            <path d="M210 12 V52 M210 41 a11.5 11.5 0 1 1 -11.5 -11.5" />
            <path d="M228 30 V52" />
            <circle cx="228" cy="15.5" r="6" fill={SUN} stroke="none" />
            <path d="M228 5.5 v3 M228 22.5 v3 M218 15.5 h3 M235 15.5 h3" stroke={SUN} strokeWidth="2.6" />
            <path d="M246 52 V30 M246 38 q4 -9 13 -9" />
            <path d="M270 41 h22 a11.5 11.5 0 1 0 -3.4 8" />
            <path d="M324 32 a11.5 11.5 0 1 0 0 17" />
            <path d="M340 14 V44 a8 8 0 0 0 8 8 M332 28 h16" />
            <path d="M196 66 q9 -7 18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0" stroke={LAGOON} strokeWidth="4.5" />
          </svg>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: SUN,
              borderRadius: "999px",
              padding: "10px 22px",
            }}
          >
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#0E9F5C" }} />
            <span style={{ fontSize: "20px", fontWeight: 700, color: INK, letterSpacing: "2px" }}>LIVE</span>
          </div>
        </div>

        {/* Corps foam : titre rond + sous-titre */}
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
              fontSize: title.length > 40 ? "54px" : "66px",
              fontWeight: 800,
              color: INK,
              lineHeight: 1.08,
              letterSpacing: "-1px",
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
                color: "#5C7886",
                margin: 0,
                maxWidth: "860px",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Pied : URL + pastille type + filet lagon */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 60px 24px" }}>
            <span style={{ fontSize: "20px", color: "#94A3B8" }}>crete.direct</span>
            <span style={{ display: "flex", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: accent }} />
          </div>
          <div style={{ display: "flex", height: "10px", backgroundColor: LAGOON, width: "100%" }} />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
