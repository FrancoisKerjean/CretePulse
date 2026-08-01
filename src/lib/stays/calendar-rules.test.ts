import { describe, it, expect } from "vitest";
import { canCheckIn, canCheckOut, maxCheckOut } from "./calendar-rules";

// Nuits prises : 10, 11, 12, 13 aout. Le sejour part le 14 au matin.
const taken = ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"];

describe("canCheckIn", () => {
  it("refuse une nuit prise", () => {
    expect(canCheckIn(taken, "2026-08-10")).toBe(false);
  });
  it("accepte le jour de depart du sejour precedent", () => {
    expect(canCheckIn(taken, "2026-08-14")).toBe(true);
  });
  it("accepte une nuit libre", () => {
    expect(canCheckIn(taken, "2026-08-05")).toBe(true);
  });
});

describe("canCheckOut", () => {
  it("accepte le premier jour d une serie prise : on dort la veille, on part le matin", () => {
    expect(canCheckOut(taken, "2026-08-09", "2026-08-10")).toBe(true);
  });
  it("refuse un depart qui enjambe une nuit prise", () => {
    expect(canCheckOut(taken, "2026-08-09", "2026-08-12")).toBe(false);
  });
  it("refuse un depart avant ou egal a l arrivee", () => {
    expect(canCheckOut(taken, "2026-08-09", "2026-08-09")).toBe(false);
    expect(canCheckOut(taken, "2026-08-09", "2026-08-08")).toBe(false);
  });
});

describe("maxCheckOut", () => {
  it("s arrete au premier jour pris apres l arrivee", () => {
    expect(maxCheckOut(taken, "2026-08-08")).toBe("2026-08-10");
  });
  it("rend null quand plus rien n est pris apres", () => {
    expect(maxCheckOut(taken, "2026-08-20")).toBe(null);
  });
});
