export type FluxEvidence = "observé" | "estimé" | "proxy" | "absent";
export type FluxCoverage = "forte" | "partielle" | "faible" | "absente";
export type FluxQualityStatus = "opérationnel" | "à consolider" | "angle mort";

export type FluxQualityItem = {
  id: string;
  decision: string;
  source: string;
  evidence: FluxEvidence;
  coverage: FluxCoverage;
  status: FluxQualityStatus;
  cadence: string;
  latestDay?: string;
  confidence: 0 | 1 | 2 | 3;
  limit: string;
  next: string;
};

export function ageInDays(isoDay: string | undefined, now = new Date()): number | null {
  if (!isoDay) return null;
  const day = new Date(`${isoDay.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(day.getTime())) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((today - day.getTime()) / 86_400_000));
}

export function freshnessLabel(item: FluxQualityItem, now = new Date()): string {
  if (item.status === "angle mort") return "non collecté";
  const age = ageInDays(item.latestDay, now);
  if (age == null) return "fraîcheur inconnue";
  if (age === 0) return "à jour aujourd'hui";
  if (age === 1) return "à jour hier";
  return `dernière donnée il y a ${age} j`;
}

export function confidenceLabel(score: FluxQualityItem["confidence"]): string {
  return ["non mesuré", "exploratoire", "indicatif", "robuste"][score];
}

