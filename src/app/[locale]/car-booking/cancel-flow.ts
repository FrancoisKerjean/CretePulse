// Annulation d'une réservation payée en deux temps (G4) : sur téléphone, un
// appui de travers ne doit jamais annuler ni rembourser. Le premier clic
// montre ce qui va se passer ; seul le second envoie.
export type CancelPhase = "idle" | "confirm";

/** Ce que fait le bouton principal dans cette phase. */
export function primaryCancelAction(phase: CancelPhase): "ask" | "send" {
  return phase === "confirm" ? "send" : "ask";
}
