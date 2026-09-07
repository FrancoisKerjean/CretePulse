import { describe, it, expect } from "vitest";
import { vanPromoLine } from "./van-guarantee-copy";
import type { VanCorridor } from "./van-corridors";

const paleochora: VanCorridor = { slug: "chania-airport--paleochora", fromName: "Chania Airport", toName: "Paleochora", priceEur: 31, threshold: 4, guaranteeCapEur: 121 };

// Source de vérité : van-crete-direct/src/lib/i18n.ts (NOTICE_WITH_CAP,
// NOTICE_NO_CAP), copiée mot pour mot le 07/09/2026. Si la phrase change
// là-bas, ce test doit rougir ici : les deux sites disent la même chose.
const VAN_WITH_CAP = {
  en: "At 4 travellers the van departs at the displayed price. Below that, 2 days before departure, we offer you either a guaranteed departure at a price shared between the travellers who joined (at most 121 € for the vehicle), or cancellation at no cost. Nothing is charged online.",
  fr: "À 4 voyageurs, le van part au tarif affiché. En dessous, 2 jours avant le départ, nous vous proposons soit un départ garanti au tarif partagé entre les inscrits (au plus 121 € pour le véhicule), soit l'annulation sans frais. Rien n'est prélevé en ligne.",
};
const VAN_NO_CAP = {
  en: "At 4 travellers the van departs at the displayed price. Below that, 2 days before departure, we let you know if the van does not depart. Nothing is charged.",
  fr: "À 4 voyageurs, le van part au tarif affiché. En dessous, 2 jours avant le départ, nous vous prévenons si le van ne part pas. Rien n'est prélevé.",
};

describe("vanPromoLine", () => {
  it("affiche le plafond du corridor quand il existe", () => {
    const s = vanPromoLine("fr", paleochora);
    expect(s).toContain("Dès 31 € par place");
    expect(s).toContain("À 4 voyageurs");
    expect(s).toContain("au plus 121 € pour le véhicule");
  });
  it("phrase courte sans coût connu", () => {
    const s = vanPromoLine("fr", { ...paleochora, guaranteeCapEur: null });
    expect(s).toContain("nous vous prévenons si le van ne part pas");
    expect(s).not.toContain("garanti");
  });
  it("dit mot pour mot la phrase de van.crete.direct (fr, en, avec et sans plafond)", () => {
    for (const l of ["fr", "en"] as const) {
      expect(vanPromoLine(l, paleochora).endsWith(VAN_WITH_CAP[l])).toBe(true);
      expect(vanPromoLine(l, { ...paleochora, guaranteeCapEur: null }).endsWith(VAN_NO_CAP[l])).toBe(true);
    }
  });
  it("jamais de placeholder, jamais de 4 en dur, jamais de tiret cadratin, 4 langues + repli en", () => {
    for (const l of ["en", "fr", "de", "el", "it"]) {
      const s = vanPromoLine(l, { ...paleochora, threshold: 6, guaranteeCapEur: 160 });
      expect(s).toContain("6");
      expect(s).toContain("160");
      expect(s).not.toContain(" 4 ");
      expect(s).not.toMatch(/\{(n|cap|p)\}/);
      expect(s).not.toContain(String.fromCharCode(0x2014));
    }
    expect(vanPromoLine("it", paleochora)).toBe(vanPromoLine("en", paleochora));
  });
});
