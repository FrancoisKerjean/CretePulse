import { describe, it, expect, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// next-intl/middleware importe `next/server` en ESM, que vitest ne resout pas depuis
// node_modules. On le remplace par un passe-plat NextResponse.next() : c'est la
// dependance externe, pas le code teste. Tout ce qui est verifie ici (blocage geo,
// X-Robots-Tag) est le code reel de src/middleware.ts.
vi.mock("next-intl/middleware", () => ({
  default: () => () => NextResponse.next(),
}));

const { default: middleware } = await import("./middleware");
const { INDEXABLE_LOCALES, routing } = await import("@/i18n/routing");

// Le X-Robots-Tag du middleware est le SEUL point de controle du noindex par locale :
// 23 templates posent leur propre `robots:` et ecrasent l'heritage du layout.
// Les deux sens doivent etre couverts, une erreur ici mettrait /en en noindex.
// Spec : docs/superpowers/specs/2026-08-01-seo-locale-scope-design.md

const req = (path: string) => new NextRequest(`https://crete.direct${path}`);

describe("middleware : X-Robots-Tag par locale", () => {
  // 🚨 CE TEST BOUCLAIT SUR UNE LISTE DEVENUE VIDE, DONC IL PASSAIT SANS RIEN VÉRIFIER.
  // Il itérait `routing.locales` moins `INDEXABLE_LOCALES` ; les 18 locales hors périmètre
  // ont quitté le routage le 20/09/2026, la liste est tombée à zéro et la boucle n'a plus
  // exécuté un seul `expect`. Un test vert qui n'assure rien est pire qu'un test rouge.
  // On assure donc désormais l'état RÉEL : plus aucune locale servie ne reçoit de noindex.
  it("ne laisse aucune locale servie recevoir un noindex", () => {
    expect(routing.locales.length).toBeGreaterThan(0);

    for (const loc of routing.locales) {
      const res = middleware(req(`/${loc}/beaches`));
      expect(res.headers.get("x-robots-tag"), `locale ${loc}`).toBeNull();
    }
  });

  it("ne pose jamais noindex sur les 4 locales du perimetre", () => {
    for (const loc of INDEXABLE_LOCALES) {
      const res = middleware(req(`/${loc}/beaches`));
      expect(res.headers.get("x-robots-tag"), `locale ${loc}`).toBeNull();
    }
  });

  it("laisse passer un chemin sans locale sans y toucher", () => {
    expect(middleware(req("/")).headers.get("x-robots-tag")).toBeNull();
  });

  // `/es` n'est plus une locale pour le middleware depuis le 20/09/2026 : `next.config.ts`
  // la redirige en 301 vers /en, et les redirections de la config sont évaluées AVANT le
  // middleware. Il n'a donc plus rien à marquer, et ne doit surtout pas traiter `es` comme
  // un préfixe de locale, c'est `localeFromPathname` qui le garantit.
  it("ne traite plus une locale retirée comme une locale", () => {
    expect(middleware(req("/es")).headers.get("x-robots-tag")).toBeNull();
    expect(middleware(req("/ja/beaches")).headers.get("x-robots-tag")).toBeNull();
  });

  // Le blocage geo Chine et la redirection ASCII sont anterieurs (voir middleware.ts).
  // Ils passent AVANT le X-Robots-Tag et doivent le rester : inutile d'annoter une
  // reponse 403 ou une 308.
  it("garde le blocage geo Chine prioritaire", () => {
    const r = new NextRequest("https://crete.direct/es/beaches", {
      headers: { "x-vercel-ip-country": "CN" },
    });

    expect(middleware(r).status).toBe(403);
  });
});
