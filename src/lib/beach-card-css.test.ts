import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const PAGE = readFileSync(join(process.cwd(), "src/app/[locale]/beaches/page.tsx"), "utf8");

/**
 * Les cartes de plage sont rendues ~182 fois. Chaque classe utilitaire y est
 * recopiee autant de fois, dans le HTML ET dans le payload RSC qui le double :
 * mesure du 01/08/2026, 149 685 octets de class= dans le rendu et 144 958 dans
 * le RSC, pour une page de 875 Ko.
 *
 * Ces tests gardent le raccourci honnete : une classe ecrite dans le JSX mais
 * absente du CSS ne casse rien de visible a la compilation, elle fait juste
 * disparaitre le style, en silence, sur 182 cartes.
 */
const SHORTHANDS = ["beach-card", "beach-card-img", "beach-card-meta", "beach-card-tags", "pill"];

describe("raccourcis CSS des cartes de plage", () => {
  it("definit dans globals.css chaque raccourci utilise", () => {
    for (const name of SHORTHANDS) {
      expect(CSS, `.${name} manque dans globals.css`).toMatch(new RegExp(`\\.${name}\\s*\\{`));
    }
  });

  it("les declare dans une couche components, pas base", () => {
    const components = CSS.slice(CSS.indexOf("@layer components"));
    expect(CSS).toContain("@layer components");
    for (const name of SHORTHANDS) {
      expect(components, `.${name} hors de @layer components`).toMatch(new RegExp(`\\.${name}\\s*\\{`));
    }
  });

  // `group` n'est pas une utilite : c'est un marqueur que `group-hover:` lit sur
  // l'ancetre. @apply group ne produirait aucune regle, et tous les survols des
  // cartes tomberaient. Il doit rester ecrit dans le JSX.
  it("n'essaie pas d'appliquer group, qui ne produit aucune regle", () => {
    const layer = CSS.slice(CSS.indexOf("@layer components"));
    expect(layer).not.toMatch(/@apply[^;]*\bgroup\b(?!-)/);
    expect(PAGE, "la carte doit garder group dans son className").toMatch(/className="group beach-card"/);
  });

  it("emploie vraiment les raccourcis dans la page", () => {
    for (const name of SHORTHANDS) {
      expect(PAGE, `.${name} defini mais jamais utilise`).toContain(name);
    }
  });

  // Le seul interet du raccourci est d'etre plus court que ce qu'il remplace.
  it("raccourcit vraiment, sinon il n'a aucune raison d'exister", () => {
    const layer = CSS.slice(CSS.indexOf("@layer components"));
    for (const name of SHORTHANDS) {
      const rule = new RegExp(`\\.${name}\\s*\\{\\s*@apply([^;]*);`).exec(layer);
      expect(rule, `.${name} sans @apply`).not.toBeNull();
      expect(rule![1].trim().length, `.${name} ne raccourcit rien`).toBeGreaterThan(name.length * 2);
    }
  });

  // Un long chapelet d'utilitaires oublie sur une carte annule le gain.
  it("ne laisse plus de className a rallonge dans la boucle des cartes", () => {
    const loop = PAGE.slice(PAGE.indexOf("beaches.map("));
    const long = [...loop.matchAll(/className="([^"{}]{70,})"/g)].map((m) => m[1]);
    expect(long, `className trop longs restants : ${long.join(" | ")}`).toEqual([]);
  });
});
