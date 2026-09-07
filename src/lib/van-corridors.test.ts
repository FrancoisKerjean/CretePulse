import { describe, it, expect } from "vitest";
import { VAN_CORRIDORS, vanCorridorsForPair } from "./van-corridors";

// Plafond = ceil(round(cost_small_eur × 110) / 100) : le coût majoré de 10 %
// arrondi au centime PUIS à l'euro supérieur (109,50 → 120,45 → 121 ;
// 145 → 159,50 → 160). Valeurs lues dans van_corridors (prod) le 07/09/2026.
const CAPS_FROM_DB: Record<string, number | null> = {
  "heraklion-airport--agios-nikolaos": null,
  "agios-nikolaos--heraklion-airport": null,
  "heraklion-airport--ierapetra": null,
  "ierapetra--heraklion-airport": null,
  "heraklion-airport--makrigialos": null,
  "makrigialos--heraklion-airport": null,
  "heraklion-airport--sitia": null,
  "sitia--heraklion-airport": null,
  "heraklion-airport--matala": null,
  "matala--heraklion-airport": null,
  "chania-airport--paleochora": 121,
  "paleochora--chania-airport": 121,
  "heraklion-airport--rethymno": 160,
  "rethymno--heraklion-airport": 160,
  "rethymno--chania-airport": 160,
  "chania-airport--rethymno": 160,
};

describe("VAN_CORRIDORS", () => {
  // Le fichier disait 30 € pour Paleochora alors que la base dit 31 € depuis
  // le 02/08 : c'est le doublon tenu à la main annoncé en tête du fichier.
  it("Paleochora est à 31 € avec un plafond véhicule de 121 €", () => {
    const c = VAN_CORRIDORS.find((x) => x.slug === "chania-airport--paleochora");
    expect(c?.priceEur).toBe(31);
    expect(c?.threshold).toBe(4);
    expect(c?.guaranteeCapEur).toBe(121);
  });
  it("le retour Paleochora a le même coût en base, donc le même plafond", () => {
    const c = VAN_CORRIDORS.find((x) => x.slug === "paleochora--chania-airport");
    expect(c?.priceEur).toBe(31);
    expect(c?.guaranteeCapEur).toBe(121);
  });
  it("chaque corridor porte un seuil et un plafond (nombre ou null, jamais 0)", () => {
    for (const c of VAN_CORRIDORS) {
      expect(c.threshold).toBeGreaterThanOrEqual(1);
      expect(c.guaranteeCapEur === null || c.guaranteeCapEur > 0).toBe(true);
    }
  });
  it("les plafonds sont ceux de la base, corridor par corridor", () => {
    for (const c of VAN_CORRIDORS) {
      expect(CAPS_FROM_DB, `corridor ${c.slug} absent de la lecture base`).toHaveProperty(c.slug);
      expect(c.guaranteeCapEur, c.slug).toBe(CAPS_FROM_DB[c.slug]);
    }
  });
  it("vanCorridorsForPair normalise les slugs bus", () => {
    expect(vanCorridorsForPair("chania", "paleochora")[0]?.slug).toBe("chania-airport--paleochora");
  });
});
