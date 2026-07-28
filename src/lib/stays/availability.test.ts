import { describe, it, expect } from "vitest";
import { eachNight, isRangeFree, unavailableNights } from "./availability";
import type { DateRange } from "./ical";

const booked: DateRange[] = [{ dateFrom: "2026-08-10", dateTo: "2026-08-14" }];

describe("eachNight", () => {
  it("liste les nuits, borne de sortie exclue", () => {
    expect(eachNight("2026-08-01", "2026-08-04")).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
  });

  it("renvoie une liste vide sur une plage nulle ou inversee", () => {
    expect(eachNight("2026-08-04", "2026-08-04")).toEqual([]);
    expect(eachNight("2026-08-04", "2026-08-01")).toEqual([]);
  });

  it("traverse un changement de mois", () => {
    expect(eachNight("2026-08-30", "2026-09-02")).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
    ]);
  });
});

describe("isRangeFree", () => {
  it("accepte une plage qui se termine le jour de l arrivee", () => {
    expect(isRangeFree(booked, "2026-08-05", "2026-08-10")).toBe(true);
  });

  it("accepte une plage qui commence le jour du depart", () => {
    expect(isRangeFree(booked, "2026-08-14", "2026-08-16")).toBe(true);
  });

  it("refuse un chevauchement par la fin", () => {
    expect(isRangeFree(booked, "2026-08-12", "2026-08-16")).toBe(false);
  });

  it("refuse un chevauchement par le debut", () => {
    expect(isRangeFree(booked, "2026-08-08", "2026-08-11")).toBe(false);
  });

  it("refuse une plage englobante", () => {
    expect(isRangeFree(booked, "2026-08-08", "2026-08-20")).toBe(false);
  });

  it("refuse une plage strictement incluse", () => {
    expect(isRangeFree(booked, "2026-08-11", "2026-08-12")).toBe(false);
  });

  it("accepte tout quand rien n est reserve", () => {
    expect(isRangeFree([], "2026-08-11", "2026-08-12")).toBe(true);
  });
});

describe("unavailableNights", () => {
  it("aplatit les plages en nuits", () => {
    expect(unavailableNights(booked)).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
    ]);
  });

  it("dedoublonne et trie des plages qui se recouvrent", () => {
    const overlapping: DateRange[] = [
      { dateFrom: "2026-08-11", dateTo: "2026-08-13" },
      { dateFrom: "2026-08-10", dateTo: "2026-08-12" },
    ];
    expect(unavailableNights(overlapping)).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
    ]);
  });
});
