import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Crete Direct";
  const subtitle = searchParams.get("subtitle") || "What's happening in Crete";
  const type = searchParams.get("type") || "default"; // beach, weather, news, event, guide

  // Color schemes per type
  const schemes: Record<string, { bg: string; accent: string }> = {
    default: { bg: "#1B4965", accent: "#B85C38" },
    beach: { bg: "#1B4965", accent: "#F5E6D3" },
    weather: { bg: "#0F2B4C", accent: "#87CEEB" },
    news: { bg: "#1A1A2E", accent: "#B85C38" },
    event: { bg: "#B85C38", accent: "#F5E6D3" },
    guide: { bg: "#5F7A3E", accent: "#F5E6D3" },
    compare: { bg: "#1B4965", accent: "#B85C38" },
    transport: { bg: "#0F2B4C", accent: "#F5E6D3" },
  };

  const scheme = schemes[type] || schemes.default;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: scheme.bg,
          padding: "60px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top: Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "32px", fontWeight: 800, color: "#FFFFFF" }}>CRETE</span>
          <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: scheme.accent }} />
          <span style={{ fontSize: "32px", fontWeight: 800, color: scheme.accent }}>DIRECT</span>
        </div>

        {/* Center: Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h1
            style={{
              fontSize: title.length > 40 ? "48px" : "56px",
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.1,
              margin: 0,
              maxWidth: "900px",
            }}
          >
            {title}
          </h1>
          {subtitle && subtitle !== title && (
            <p
              style={{
                fontSize: "24px",
                color: "rgba(255,255,255,0.6)",
                margin: 0,
                maxWidth: "700px",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Bottom: URL */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px", color: "rgba(255,255,255,0.4)" }}>crete.direct</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
