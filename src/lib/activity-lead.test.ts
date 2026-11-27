import { describe, it, expect } from "vitest";
import { activitySubmitView } from "./activity-lead";

describe("activitySubmitView : écran affiché après l'envoi du wizard activités", () => {
  it("aucun prestataire joint ({ ok: false, noPartner }) : écran « nous cherchons », pas une erreur", () => {
    expect(activitySubmitView(200, { ok: false, noPartner: true })).toBe("noProvider");
  });

  it("combinaison non couverte (400 + error) : écran « nous cherchons »", () => {
    expect(activitySubmitView(400, { error: "No provider for this activity here yet" })).toBe("noProvider");
  });

  it("demande partie : écran « envoyé »", () => {
    expect(activitySubmitView(200, { ok: true })).toBe("sent");
  });

  it("panne serveur ou réponse illisible : erreur", () => {
    expect(activitySubmitView(500, { error: "Could not save request" })).toBe("error");
    expect(activitySubmitView(200, null)).toBe("error");
  });
});
