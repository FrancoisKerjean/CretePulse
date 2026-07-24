export type FluxRecommendation = {
  id: string;
  priority: "à préparer" | "à surveiller" | "bloquée";
  title: string;
  observation: string;
  action: string;
  owner: string;
  confidence: "forte" | "moyenne" | "faible";
  guardrail: string;
};

export type FluxRecommendationInput = {
  cruisePax7: number;
  busSearches30: number;
  busSearchesZero30: number;
  topZeroRoute?: string;
  latestIntentDay?: string;
  latestBusDay?: string;
  stockMeasuredDays?: number | null;
  stockLow?: number | null;
  stockHigh?: number | null;
};

const ageInDays = (iso: string | undefined, today: string) => {
  if (!iso) return Number.POSITIVE_INFINITY;
  return Math.floor(
    (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${iso}T12:00:00Z`)) / 86_400_000,
  );
};

export function buildFluxRecommendations(
  input: FluxRecommendationInput,
  today: string,
): FluxRecommendation[] {
  const recommendations: FluxRecommendation[] = [];
  const intentFresh = ageInDays(input.latestIntentDay, today) <= 2;
  const busFresh = ageInDays(input.latestBusDay, today) <= 1;

  if (
    intentFresh
    && input.busSearches30 >= 100
    && input.busSearchesZero30 >= 10
    && input.topZeroRoute
  ) {
    recommendations.push({
      id: "verify-unserved-demand",
      priority: "à préparer",
      title: `Vérifier le corridor ${input.topZeroRoute}`,
      observation: `${input.busSearchesZero30} recherches sur ${input.busSearches30} n'ont renvoyé aucun résultat sur 30 jours.`,
      action: "Comparer les recherches aux horaires KTEL à jour, puis corriger l'information ou instruire un besoin de liaison.",
      owner: "KTEL + Région",
      confidence: "moyenne",
      guardrail: "Un résultat vide ne prouve pas qu'une liaison est absente.",
    });
  }

  if (input.cruisePax7 >= 5_000) {
    recommendations.push({
      id: "cruise-peak-readiness",
      priority: "à préparer",
      title: "Préparer les jours de forte arrivée croisière",
      observation: `${input.cruisePax7.toLocaleString("fr-FR")} passagers sont annoncés à Héraklion sous 7 jours.`,
      action: "Partager les jours de pointe avec le port et le KTEL, puis vérifier offre, information et capacité de correspondance.",
      owner: "Port + KTEL + Région",
      confidence: "moyenne",
      guardrail: "Le calendrier indique une capacité annoncée, pas le nombre réellement débarqué.",
    });
  }

  if (busFresh) {
    recommendations.push({
      id: "bus-capacity-gap",
      priority: "bloquée",
      title: "Ne pas recommander de renfort bus sur le seul GPS",
      observation: "Les mouvements des bus urbains sont observés, mais leur charge passagers ne l'est pas.",
      action: "Demander un comptage agrégé ou un test terrain avant toute recommandation de fréquence ou de capacité.",
      owner: "KTEL / opérateurs urbains",
      confidence: "forte",
      guardrail: "Présence d'un véhicule ≠ places disponibles ni voyageurs transportés.",
    });
  }

  const stockWidth =
    input.stockLow != null && input.stockHigh != null && input.stockLow > 0
      ? (input.stockHigh - input.stockLow) / input.stockLow
      : Number.POSITIVE_INFINITY;
  if ((input.stockMeasuredDays ?? 0) < 7 || stockWidth > 0.3) {
    recommendations.push({
      id: "stock-not-actionable",
      priority: "bloquée",
      title: "Ne pas utiliser le stock touristique pour décider aujourd'hui",
      observation: `La fenêtre ne contient que ${input.stockMeasuredDays ?? 0} jours mesurés et/ou une fourchette trop large.`,
      action: "Attendre une fenêtre complète et recalibrer avant d'utiliser cet indicateur dans une décision opérationnelle.",
      owner: "Crete Direct data",
      confidence: "forte",
      guardrail: "L'estimation reste visible comme contexte, jamais comme statistique officielle.",
    });
  }

  return recommendations;
}
