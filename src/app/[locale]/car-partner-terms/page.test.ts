// Ce que cette page NE doit jamais devenir : une page de contenu.
//
// C est un document contractuel B2B, en anglais, adresse a une dizaine de
// loueurs cretois. Publiee en 22 langues elle ajouterait 22 URL indexables au
// moment ou la chute Google du 19/07 est attribuee au volume declare au
// sitemap. Les deux gardes ci-dessous sont donc du fond, pas du detail : elles
// disent la decision, et la feront tomber si quelqu un la defait sans le savoir.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { generateMetadata } from "./page";

describe("car-partner-terms", () => {
  it("ne s indexe pas et ne transmet pas de jus de lien", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });
    expect(meta.robots).toMatchObject({ index: false, follow: false });
  });

  it("porte une canonique sur sa propre locale", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "fr" }) });
    expect(meta.alternates?.canonical).toBe("https://crete.direct/fr/car-partner-terms");
  });

  // La liste STATIC_PAGES du sitemap est explicite : rien n y entre tout seul.
  // Ce test protege contre l ajout distrait, pas contre un mecanisme.
  it("n est pas declaree au sitemap", () => {
    const sitemap = readFileSync("src/app/sitemap.xml/route.ts", "utf8");
    expect(sitemap).not.toContain("car-partner-terms");
  });
});
