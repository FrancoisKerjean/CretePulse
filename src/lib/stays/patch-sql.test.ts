import { describe, it, expect } from "vitest";
import { buildUpdateSql, PATCH_COLUMNS } from "./patch-sql";

describe("buildUpdateSql", () => {
  it("ecrit les colonnes du patch et borne la mise a jour a l id", () => {
    const sql = buildUpdateSql(7, { rating_avg: 4.88, reviews_count: 33 });
    expect(sql).toContain("update stay_listings set");
    expect(sql).toContain("rating_avg = 4.88");
    expect(sql).toContain("reviews_count = 33");
    expect(sql).toContain("where id = 7");
  });

  it("quote les chaines et les horodatages", () => {
    const sql = buildUpdateSql(1, {
      description_locale: "en",
      reviews_captured_at: "2026-08-11T07:15:12.901Z",
    });
    expect(sql).toContain("description_locale = 'en'");
    expect(sql).toContain("reviews_captured_at = '2026-08-11T07:15:12.901Z'");
  });

  // ⛔ Les valeurs viennent d un scrape : tout ce qui n est pas explicitement
  // reconnu doit faire ECHOUER la construction, jamais finir dans le SQL.
  it("refuse une colonne hors de la liste fermee", () => {
    expect(() => buildUpdateSql(1, { role: "admin" } as never))
      .toThrow(/colonne/i);
  });

  it("refuse une chaine qui n est pas un code langue", () => {
    expect(() => buildUpdateSql(1, { description_locale: "en'; drop table stay_listings; --" }))
      .toThrow(/description_locale/i);
    expect(() => buildUpdateSql(1, { description_locale: "english" })).toThrow();
  });

  it("refuse un horodatage qui n est pas ISO", () => {
    expect(() => buildUpdateSql(1, { reviews_captured_at: "now()" })).toThrow(/reviews_captured_at/i);
  });

  it("refuse un nombre non fini", () => {
    expect(() => buildUpdateSql(1, { rating_avg: NaN })).toThrow(/rating_avg/i);
    expect(() => buildUpdateSql(1, { lat: Infinity })).toThrow(/lat/i);
  });

  it("refuse un id qui n est pas un entier", () => {
    expect(() => buildUpdateSql(1.5, { rating_avg: 4 })).toThrow(/id/i);
    expect(() => buildUpdateSql(Number("x"), { rating_avg: 4 })).toThrow(/id/i);
  });

  it("refuse un patch vide : un update sans SET est une erreur, pas un no-op", () => {
    expect(() => buildUpdateSql(1, {})).toThrow(/vide/i);
  });

  it("la liste fermee couvre exactement ce que le worker ecrit", () => {
    expect([...PATCH_COLUMNS].sort()).toEqual([
      "description_locale", "lat", "lng", "max_guests",
      "rating_avg", "reviews_captured_at", "reviews_count",
    ]);
  });
});
