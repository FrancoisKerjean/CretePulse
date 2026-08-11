import { describe, it, expect } from "vitest";
import { nightsBetween, computeQuote, quoteForNights, balanceApplicationFeeCents } from "./pricing";

describe("nightsBetween", () => {
  it("counts nights exclusive of checkout", () => {
    expect(nightsBetween("2026-07-01", "2026-07-08")).toBe(7);
  });
  it("throws on non-positive range", () => {
    expect(() => nightsBetween("2026-07-08", "2026-07-01")).toThrow();
  });
});

describe("computeQuote", () => {
  it("adds 5% commission on top of owner net (100 EUR/night x7)", () => {
    const q = computeQuote({
      basePriceEur: 100,
      cleaningFeeEur: 0,
      commissionRate: 5,
      dateFrom: "2026-07-01",
      dateTo: "2026-07-08",
    });
    expect(q.nights).toBe(7);
    expect(q.ownerNetEur).toBe(700);
    expect(q.commissionEur).toBe(35);
    expect(q.guestTotalEur).toBe(735);
    expect(q.depositEur).toBe(220.5);
    expect(q.balanceEur).toBe(514.5);
    expect(q.applicationFeeCents).toBe(1050);
  });

  it("multiplies the nightly price by the number of nights", () => {
    const short = computeQuote({
      basePriceEur: 90,
      cleaningFeeEur: 0,
      commissionRate: 5,
      dateFrom: "2026-09-01",
      dateTo: "2026-09-03",
    });
    const long = computeQuote({
      basePriceEur: 90,
      cleaningFeeEur: 0,
      commissionRate: 5,
      dateFrom: "2026-09-01",
      dateTo: "2026-09-05",
    });
    expect(short.nights).toBe(2);
    expect(short.ownerNetEur).toBe(180);
    expect(long.nights).toBe(4);
    expect(long.ownerNetEur).toBe(360);
    // Le prix a la nuit est fixe : doubler les nuits double le net proprietaire.
    expect(long.ownerNetEur).toBe(short.ownerNetEur * 2);
  });

  it("adds the cleaning fee once per stay, not per night", () => {
    const q = computeQuote({
      basePriceEur: 100,
      cleaningFeeEur: 50,
      commissionRate: 5,
      dateFrom: "2026-08-01",
      dateTo: "2026-08-04",
    });
    expect(q.nights).toBe(3);
    expect(q.ownerNetEur).toBe(350);
    expect(q.commissionEur).toBe(17.5);
    expect(q.guestTotalEur).toBe(367.5);
  });
});

describe("balanceApplicationFeeCents", () => {
  const cases = [
    { basePriceEur: 100, cleaningFeeEur: 0, commissionRate: 5, dateFrom: "2026-07-01", dateTo: "2026-07-08" },
    { basePriceEur: 87, cleaningFeeEur: 45, commissionRate: 5, dateFrom: "2026-08-01", dateTo: "2026-08-04" },
    { basePriceEur: 233.33, cleaningFeeEur: 12.5, commissionRate: 7.5, dateFrom: "2026-09-10", dateTo: "2026-09-21" },
    { basePriceEur: 45, cleaningFeeEur: 0, commissionRate: 12, dateFrom: "2026-05-02", dateTo: "2026-05-05" },
  ];

  it("porte exactement le reste de la commission, au centime", () => {
    for (const input of cases) {
      const q = computeQuote(input);
      expect(q.applicationFeeCents + balanceApplicationFeeCents(q)).toBe(
        Math.round(q.commissionEur * 100),
      );
    }
  });

  it("ne descend jamais sous zero", () => {
    for (const input of cases) {
      expect(balanceApplicationFeeCents(computeQuote(input))).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("quoteForNights", () => {
  // La fiche annonce un prix a la nuit, mais ce que le voyageur veut savoir est
  // le total du sejour le plus court qu'il puisse reserver. Il le calculait de
  // tete, minimum de nuits et frais compris.
  it("chiffre le sejour minimum de l annonce", () => {
    const q = quoteForNights(5, { basePriceEur: 945, cleaningFeeEur: 0, commissionRate: 5 });
    expect(q.nights).toBe(5);
    expect(q.ownerNetEur).toBe(4725);
    expect(q.commissionEur).toBe(236.25);
    expect(q.guestTotalEur).toBe(4961.25);
  });

  it("compte le menage UNE fois, jamais par nuit", () => {
    const q = quoteForNights(3, { basePriceEur: 441, cleaningFeeEur: 120, commissionRate: 5 });
    expect(q.ownerNetEur).toBe(441 * 3 + 120);
  });

  // Meme formule que le tunnel d encaissement : si les deux divergeaient, la
  // fiche annoncerait un total que la demande ne confirmerait pas.
  it("rend exactement ce que computeQuote rend sur les memes nuits", () => {
    const common = { basePriceEur: 200, cleaningFeeEur: 60, commissionRate: 5 };
    const parDates = computeQuote({ ...common, dateFrom: "2026-09-01", dateTo: "2026-09-06" });
    const parNuits = quoteForNights(5, common);
    expect(parNuits).toEqual(parDates);
  });

  it("refuse un nombre de nuits qui n a pas de sens", () => {
    expect(() => quoteForNights(0, { basePriceEur: 100, cleaningFeeEur: 0, commissionRate: 5 })).toThrow();
    expect(() => quoteForNights(2.5, { basePriceEur: 100, cleaningFeeEur: 0, commissionRate: 5 })).toThrow();
  });
});
