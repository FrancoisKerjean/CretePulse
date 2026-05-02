import { ImageResponse } from "next/og";
import { getGuideBySlug, getLocalizedGuideField } from "@/lib/guides";
import type { Locale } from "@/lib/types";

export const runtime = "nodejs";
export const alt = "Crete Direct guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CATEGORY_TINT: Record<string, [string, string]> = {
  beaches: ["#1e60a8", "#3b82d8"],
  hikes: ["#5b6e3a", "#84a04d"],
  travel: ["#8a5a3b", "#c08a5a"],
  food: ["#a64545", "#d27575"],
  expat: ["#3b3a5a", "#6e6e94"],
  news: ["#1e60a8", "#3b82d8"],
  family: ["#a04a8a", "#d075b0"],
};

export default async function OpengraphImage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const guide = await getGuideBySlug(params.slug);

  const title = guide
    ? getLocalizedGuideField(guide, "titles", params.locale as Locale) || ""
    : "Crete Direct";

  const category = guide?.category || "news";
  const [c1, c2] = CATEGORY_TINT[category] || CATEGORY_TINT.news;

  const trimmedTitle = title.length > 110 ? title.slice(0, 107) + "..." : title;

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
          Crete Direct
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              maxWidth: 1000,
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
            fontSize: 24,
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
