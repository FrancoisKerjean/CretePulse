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
  it("pose noindex sur chacune des 18 locales hors perimetre", () => {
    const horsPerimetre = routing.locales.filter(
      (l) => !(INDEXABLE_LOCALES as readonly string[]).includes(l),
    );

    for (const loc of horsPerimetre) {
      const res = middleware(req(`/${loc}/beaches`));
      expect(res.headers.get("x-robots-tag"), `locale ${loc}`).toBe("noindex, follow");
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

  it("noindex aussi la racine d'une locale hors perimetre", () => {
    expect(middleware(req("/es")).headers.get("x-robots-tag")).toBe("noindex, follow");
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
