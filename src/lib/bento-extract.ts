import type { BentoTiles } from "./bento-tiles";

export interface EnrichRow { slug: string; tiles: BentoTiles }

export function parseClaudeJsonArray(raw: string): EnrichRow[] {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error("Claude response is not a JSON array");
  return parsed as EnrichRow[];
}
