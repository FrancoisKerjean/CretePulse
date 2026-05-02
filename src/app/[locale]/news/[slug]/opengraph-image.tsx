import { ImageResponse } from "next/og";
import { getNewsBySlug } from "@/lib/news";
import { getLocalizedField, type Locale } from "@/lib/types";

export const runtime = "nodejs";
export const alt = "Crete Direct news";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CATEGORY_TINT: Record<string, [string, string]> = {
  politics:    ["#1e3a5f", "#3b6094"],
  tourism:     ["#a05a3b", "#c8895a"],
  culture:     ["#6b5d3a", "#9c8a5a"],
  environment: ["#4a6b3b", "#75944a"],
  economy:     ["#3a4a5a", "#5a6a7a"],
  sports:      ["#1e60a8", "#3b82d8"],
  weather:     ["#3b8aa8", "#5ab0d0"],
  general:     ["#1e3a5f", "#3b6094"],
};

export default async function OpengraphImage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const item = await getNewsBySlug(params.slug);
  const loc = params.locale as Locale;

  const title = item ? getLocalizedField(item, "title", loc) || "" : "Crete news";
  const category = item?.category || "news";
  const [c1, c2] = CATEGORY_TINT[category] || CATEGORY_TINT.general;

  const trimmedTitle = title.length > 130 ? title.slice(0, 127) + "..." : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
          padding: 70,
          color: "white",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "uppercase",
            fontWeight: 700,
            opacity: 0.92,
          }}
        >
          <span style={{ display: "flex", width: 12, height: 12, background: "white", borderRadius: 999 }} />
          Crete Direct · News
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: 1050,
              textShadow: "0 4px 20px rgba(0,0,0,0.25)",
            }}
          >
            {trimmedTitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            opacity: 0.85,
          }}
        >
          <span style={{ display: "flex", textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>
            {category}
          </span>
          <span style={{ display: "flex", fontStyle: "italic" }}>crete.direct</span>
        </div>
      </div>
    ),
    size,
  );
}
