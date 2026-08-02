import { describe, it, expect } from "vitest";
import { diffOtaNights } from "./ical-sync";
import type { DateRange } from "./ical";

const feed: DateRange[] = [{ dateFrom: "2026-08-10", dateTo: "2026-08-13" }];

describe("diffOtaNights", () => {
  it("ajoute les nuits nouvellement bloquees par l OTA", () => {
    const d = diffOtaNights(feed, []);
    expect(d.toBlock).toEqual(["2026-08-10", "2026-08-11", "2026-08-12"]);
    expect(d.toRelease).toEqual([]);
  });

  it("libere les nuits disparues du flux", () => {
    const d = diffOtaNights([], [
      { date: "2026-08-10", status: "blocked_ota" },
      { date: "2026-08-11", status: "blocked_ota" },
    ]);
    expect(d.toBlock).toEqual([]);
    expect(d.toRelease).toEqual(["2026-08-10", "2026-08-11"]);
  });

  it("ne touche JAMAIS une nuit vendue par crete.direct", () => {
    // C'est l'invariant qui compte : un flux Airbnb incomplet ou une panne de
    // lecture ne doit jamais liberer une nuit deja payee par un voyageur.
    const d = diffOtaNights([], [{ date: "2026-08-10", status: "booked" }]);
    expect(d.toRelease).toEqual([]);
  });

  it("ne rebloque pas une nuit deja bloquee", () => {
    const d = diffOtaNights(feed, [
      { date: "2026-08-10", status: "blocked_ota" },
      { date: "2026-08-11", status: "blocked_ota" },
      { date: "2026-08-12", status: "blocked_ota" },
    ]);
    expect(d.toBlock).toEqual([]);
    expect(d.toRelease).toEqual([]);
  });

  it("laisse intacte une nuit vendue qui apparait aussi dans le flux OTA", () => {
    const d = diffOtaNights(feed, [{ date: "2026-08-10", status: "booked" }]);
    expect(d.toBlock).toEqual(["2026-08-11", "2026-08-12"]);
    expect(d.toRelease).toEqual([]);
  });

  it("ne libere pas une nuit bloquee a la main par le proprietaire", () => {
    // `hold` est pose par le proprietaire depuis son espace, pas par l'OTA :
    // le flux Airbnb n'a aucune autorite dessus.
    const d = diffOtaNights([], [{ date: "2026-08-10", status: "hold" }]);
    expect(d.toRelease).toEqual([]);
  });

  it("exclut la nuit de depart, qui n est pas occupee", () => {
    // Convention iCal : DTEND est exclusif. Un sejour du 10 au 13 occupe trois
    // nuits, la nuit du 13 est libre.
    const d = diffOtaNights([{ dateFrom: "2026-08-10", dateTo: "2026-08-13" }], []);
    expect(d.toBlock).not.toContain("2026-08-13");
    expect(d.toBlock).toHaveLength(3);
  });

  it("fusionne des plages qui se chevauchent sans doublonner", () => {
    const d = diffOtaNights(
      [
        { dateFrom: "2026-08-10", dateTo: "2026-08-12" },
        { dateFrom: "2026-08-11", dateTo: "2026-08-13" },
      ],
      [],
    );
    expect(d.toBlock).toEqual(["2026-08-10", "2026-08-11", "2026-08-12"]);
  });

  it("rend des listes triees, pour un journal lisible", () => {
    const d = diffOtaNights(
      [{ dateFrom: "2026-09-01", dateTo: "2026-09-03" }, { dateFrom: "2026-08-10", dateTo: "2026-08-11" }],
      [],
    );
    expect(d.toBlock).toEqual(["2026-08-10", "2026-09-01", "2026-09-02"]);
  });

  it("ignore une plage vide ou inversee au lieu de planter", () => {
    // Un flux OTA malforme ne doit pas faire echouer la passe entiere.
    const d = diffOtaNights(
      [{ dateFrom: "2026-08-13", dateTo: "2026-08-10" }, { dateFrom: "2026-08-10", dateTo: "2026-08-10" }],
      [],
    );
    expect(d.toBlock).toEqual([]);
  });
});
