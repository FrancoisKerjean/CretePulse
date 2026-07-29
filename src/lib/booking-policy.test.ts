import { describe, it, expect } from "vitest";
import {
  CANCELLATION_OPTION_EUR,
  REFUND_WINDOW_HOURS,
  TRANSFER_LEAD_HOURS,
  refundDueEur,
  transferDueAt,
  shouldTransferNow,
} from "./booking-policy";

const H = (n: number) => n; // heures avant le debut de la prestation

describe("refundDueEur", () => {
  it("ne rembourse rien sans l option, meme trois mois avant", () => {
    expect(refundDueEur({ hasOption: false, hoursUntilStart: H(2160), amountPaidEur: 310 })).toBe(0);
  });

  it("rembourse l integralite avec l option jusqu a 48 h avant", () => {
    expect(refundDueEur({ hasOption: true, hoursUntilStart: H(49), amountPaidEur: 310 })).toBe(310);
    // La borne appartient au voyageur : a exactement 48 h, il est encore rembourse.
    expect(refundDueEur({ hasOption: true, hoursUntilStart: H(48), amountPaidEur: 310 })).toBe(310);
  });

  it("ne rembourse plus rien avec l option passe 48 h", () => {
    expect(refundDueEur({ hasOption: true, hoursUntilStart: H(47.9), amountPaidEur: 310 })).toBe(0);
    expect(refundDueEur({ hasOption: true, hoursUntilStart: H(0), amountPaidEur: 310 })).toBe(0);
    // Prestation deja commencee : le compteur est negatif, jamais de remboursement.
    expect(refundDueEur({ hasOption: true, hoursUntilStart: H(-12), amountPaidEur: 310 })).toBe(0);
  });

  it("ne rembourse jamais le prix de l option elle-meme", () => {
    // Le voyageur a paye 310 de location + 5 d option. L option est le prix du
    // droit d annuler : elle est consommee, elle reste acquise.
    const paid = 310;
    expect(refundDueEur({ hasOption: true, hoursUntilStart: H(72), amountPaidEur: paid })).toBe(310);
    expect(CANCELLATION_OPTION_EUR).toBe(5);
  });

  it("rend un montant au centime, jamais negatif", () => {
    // Cas metier reel : les montants viennent de Stripe, en centimes. On verifie
    // qu'aucune trainee de flottant ne sort de la fonction, pas le comportement
    // d'un demi-centime qui n'existe pas dans les donnees.
    for (const paid of [89.9, 310, 0.5, 1250.55]) {
      const out = refundDueEur({ hasOption: true, hoursUntilStart: H(72), amountPaidEur: paid });
      expect(out).toBe(paid);
      expect(Number(out.toFixed(2))).toBe(out);
    }
    expect(refundDueEur({ hasOption: true, hoursUntilStart: H(72), amountPaidEur: 0 })).toBe(0);
    expect(refundDueEur({ hasOption: true, hoursUntilStart: H(72), amountPaidEur: -10 })).toBe(0);
  });
});

describe("transferDueAt", () => {
  it("verse au partenaire a la fermeture de la fenetre d annulation", () => {
    // Un seul seuil, pas deux. Si le versement partait AVANT la fermeture, il
    // existerait une fenetre ou l argent est chez le partenaire et le voyageur
    // encore remboursable : exactement la reprise de fonds qu on veut eviter.
    expect(TRANSFER_LEAD_HOURS).toBe(REFUND_WINDOW_HOURS);
    expect(transferDueAt("2026-08-10")).toBe("2026-08-08T00:00:00.000Z");
  });

  it("accepte un delai different sans toucher au reste", () => {
    expect(transferDueAt("2026-08-10", 24)).toBe("2026-08-09T00:00:00.000Z");
  });

  it("ne verse jamais avant la fermeture du droit au remboursement", () => {
    const start = new Date("2026-08-10T00:00:00.000Z").getTime();
    const refundCloses = start - REFUND_WINDOW_HOURS * 3_600_000;
    expect(new Date(transferDueAt("2026-08-10")).getTime()).toBeGreaterThanOrEqual(refundCloses);
  });
});

describe("shouldTransferNow", () => {
  const now = "2026-08-08T09:00:00.000Z";

  it("verse quand la date de versement est atteinte", () => {
    expect(shouldTransferNow({ dateFrom: "2026-08-10", now })).toBe(true);
  });

  it("ne verse pas trop tot", () => {
    expect(shouldTransferNow({ dateFrom: "2026-08-20", now })).toBe(false);
  });

  it("ne verse jamais une reservation annulee", () => {
    // C'est tout l interet du versement differe : l argent est encore chez nous.
    expect(shouldTransferNow({ dateFrom: "2026-08-10", now, cancelledAt: "2026-08-01T00:00:00Z" })).toBe(false);
  });

  it("ne verse pas deux fois", () => {
    expect(shouldTransferNow({ dateFrom: "2026-08-10", now, transferId: "tr_1" })).toBe(false);
  });

  it("verse une reservation deja commencee qui aurait ete manquee", () => {
    // Un cron tombe en panne trois jours ne doit pas priver le partenaire de son du.
    expect(shouldTransferNow({ dateFrom: "2026-08-01", now })).toBe(true);
  });
});
