import { describe, expect, it } from "vitest";
import { SPRITE_ICONS, SPRITE_ID_PREFIX, spriteHref, type SpriteIconName } from "./icon-sprite";

const NAMES = Object.keys(SPRITE_ICONS) as SpriteIconName[];

describe("SPRITE_ICONS", () => {
  it("declare les icones repetees dans les cartes de plage", () => {
    for (const name of ["map-pin", "waves", "car", "fish"]) {
      expect(NAMES).toContain(name);
    }
  });

  // Un symbole declare mais jamais appele est du poids mort sur CHAQUE page qui
  // rend le sprite. La goutte de WaterQualityBadge est volontairement restee sur
  // lucide-react : ce composant sert aussi dans ExploreView, ou le sprite n'est
  // pas rendu, et un <use> sans symbole disparait en silence.
  it("ne declare aucune icone que les cartes n'utilisent pas", () => {
    expect(NAMES.sort()).toEqual(["car", "fish", "map-pin", "waves"]);
  });

  it("donne a chaque icone un viewBox et un corps non vide", () => {
    for (const name of NAMES) {
      const icon = SPRITE_ICONS[name];
      expect(icon.viewBox, name).toMatch(/^[\d\s.-]+$/);
      expect(icon.body.length, name).toBeGreaterThan(10);
    }
  });

  // Le corps vit dans un <symbol> partage : une balise <svg> imbriquee y serait
  // invalide, et un attribut class ferait revenir le poids qu'on vient d'enlever.
  it("ne laisse ni svg imbrique ni class dans le corps des symboles", () => {
    for (const name of NAMES) {
      expect(SPRITE_ICONS[name].body, name).not.toMatch(/<svg/);
      expect(SPRITE_ICONS[name].body, name).not.toMatch(/class=/);
    }
  });

  it("nomme les icones en kebab-case, sans doublon de corps", () => {
    for (const name of NAMES) {
      expect(name, name).toMatch(/^[a-z][a-z0-9-]*$/);
    }
    const bodies = NAMES.map((n) => SPRITE_ICONS[n].body);
    expect(new Set(bodies).size, "deux icones partagent le meme corps").toBe(bodies.length);
  });
});

describe("spriteHref", () => {
  it("pointe vers l'ancre du symbole", () => {
    expect(spriteHref("map-pin")).toBe(`#${SPRITE_ID_PREFIX}map-pin`);
  });

  it("prefixe pour ne pas entrer en collision avec un id de page", () => {
    expect(SPRITE_ID_PREFIX.length).toBeGreaterThan(0);
    for (const name of NAMES) {
      expect(spriteHref(name).startsWith(`#${SPRITE_ID_PREFIX}`), name).toBe(true);
    }
  });
});

// Raison d'etre du sprite. Mesure du 01/08/2026 sur /en/beaches en production :
// 504 balises <svg> pour 17 icones distinctes, 234 569 octets, soit 53 % du HTML
// rendu et 226 441 octets de pure duplication. Un <use> pese une fraction du
// dessin qu'il reference : si ce rapport se degrade, le sprite ne sert plus a rien.
describe("gain de poids", () => {
  it("rend une reference bien plus legere que le dessin qu'elle remplace", () => {
    for (const name of NAMES) {
      const reference = `<use href="${spriteHref(name)}"/>`;
      expect(reference.length * 3, name).toBeLessThan(SPRITE_ICONS[name].body.length);
    }
  });

  it("amortit le sprite des la deuxieme occurrence", () => {
    // Le sprite paie le corps UNE fois, puis chaque usage ne coute qu'un <use>.
    const total = (name: SpriteIconName, uses: number) =>
      SPRITE_ICONS[name].body.length + uses * `<use href="${spriteHref(name)}"/>`.length;
    const inline = (name: SpriteIconName, uses: number) => uses * SPRITE_ICONS[name].body.length;
    for (const name of NAMES) {
      expect(total(name, 2), name).toBeLessThan(inline(name, 2));
    }
  });
});
