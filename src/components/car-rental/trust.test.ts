import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RatingLine } from "./trust";

const html = (props: Partial<Parameters<typeof RatingLine>[0]> = {}) =>
  renderToStaticMarkup(createElement(RatingLine, { rating: 4.8, count: 367, locale: "fr", countLabel: "{n} avis Google", ...props }));

describe("RatingLine", () => {
  it("par défaut : note et nombre d'avis, sans attribution", () => {
    const h = html();
    expect(h).toContain("4,8");
    expect(h).toContain("367 avis Google");
    expect(h).not.toContain("Google Maps");
  });
  it("masquée : note et attribution « Google Maps », jamais le nombre d'avis", () => {
    const h = html({ hideCount: true });
    expect(h).toContain("4,8");
    expect(h).not.toContain("367");
    expect(h).not.toContain("avis");
    expect(h).toContain("Google Maps");
  });
  it("attribution Google : non traduite, insécable, Roboto 400, #5E5E5E sur clair, #FFFFFF sur sombre, 12 à 16 px", () => {
    const light = html({ hideCount: true });
    expect(light).toContain('translate="no"');
    expect(light).toContain("whitespace-nowrap");
    expect(light).toContain("Roboto");
    expect(light).toContain("font-weight:400");
    expect(light).toContain("letter-spacing:normal");
    expect(light).toContain("color:#5E5E5E");
    expect(light).toMatch(/font-size:1[2-6]px/);
    const dark = html({ hideCount: true, tone: "dark" });
    expect(dark).toContain("color:#FFFFFF");
    expect(dark).not.toContain("#5E5E5E");
  });
});
