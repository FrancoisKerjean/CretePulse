// Calendrier, décision au clic et textes du suivi d'issue. Tout est pur : le
// moindre écart de borne (J+4 à la seconde) se teste sans base ni horloge.
import { describe, it, expect } from "vitest";
import {
  addDays, ddmm, shortName,
  outcomeFollowupStep, outcomeClickDecision, outcomePageState,
  outcomeQuestionSubject, outcomeQuestionBody,
  outcomeBadgeLabel, followupStatusLine,
  type OutcomeQuestionMail, type ClickRow,
} from "./car-outcome-followup";

const TODAY = "2026-09-16";
const EMDASH = String.fromCharCode(0x2014);

describe("addDays / ddmm / shortName", () => {
  it("décale une date civile sans fuseau", () => {
    expect(addDays("2026-09-15", 10)).toBe("2026-09-25");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });
  it("ddmm rend JJ/MM", () => expect(ddmm("2026-09-08")).toBe("08/09"));
  it("shortName garde le prénom et l'initiale", () => {
    expect(shortName("Marie Dupont")).toBe("Marie D.");
    expect(shortName("Marie")).toBe("Marie");
    expect(shortName("  Jean Pierre Martin ")).toBe("Jean M.");
  });
});

describe("outcomeFollowupStep", () => {
  const base = { date_to: "2026-09-15", outcome_followup_count: 0, outcome_followup_sent_at: null, outcome_followup_escalated_at: null };

  it("date_to = today ne déclenche rien : la location se termine aujourd'hui", () => {
    expect(outcomeFollowupStep({ ...base, date_to: TODAY }, TODAY)).toBe("none");
  });
  it("date_to < today et count 0 : email 1", () => {
    expect(outcomeFollowupStep(base, TODAY)).toBe("send");
  });
  it("count 1 : email 2 le 3e jour civil après l'envoi, pas la veille", () => {
    const send = { ...base, outcome_followup_count: 1, outcome_followup_sent_at: "2026-09-13T06:20:00.000Z" };
    expect(outcomeFollowupStep(send, TODAY)).toBe("send");
    expect(outcomeFollowupStep({ ...send, outcome_followup_sent_at: "2026-09-14T06:20:00.000Z" }, TODAY)).toBe("none");
  });
  it("count 2 : email 3 le 4e jour civil après l'envoi, pas la veille", () => {
    const send = { ...base, outcome_followup_count: 2, outcome_followup_sent_at: "2026-09-12T06:20:00.000Z" };
    expect(outcomeFollowupStep(send, TODAY)).toBe("send");
    expect(outcomeFollowupStep({ ...send, outcome_followup_sent_at: "2026-09-13T06:20:00.000Z" }, TODAY)).toBe("none");
  });
  it("gigue du cron : 35 s d'avance sur la passe suivante ne repoussent pas l'email d'un jour", () => {
    const row = { ...base, date_to: "2026-09-09", outcome_followup_count: 1, outcome_followup_sent_at: "2026-09-10T06:20:45.000Z" };
    expect(outcomeFollowupStep(row, "2026-09-13")).toBe("send");
  });
  it("count 3 : escalade quand date_to + 10 j <= today, rien avant", () => {
    const row = { ...base, outcome_followup_count: 3, outcome_followup_sent_at: "2026-09-15T06:20:00.000Z" };
    expect(outcomeFollowupStep({ ...row, date_to: "2026-09-06" }, TODAY)).toBe("escalate");
    expect(outcomeFollowupStep({ ...row, date_to: "2026-09-07" }, TODAY)).toBe("none");
  });
  it("déjà escaladée : rappel à chaque passage", () => {
    expect(outcomeFollowupStep({ ...base, outcome_followup_count: 3, outcome_followup_escalated_at: "2026-09-10T06:20:00.000Z" }, TODAY)).toBe("remind");
  });
  it("colonnes absentes (prod pas migrée) : lues comme count 0", () => {
    expect(outcomeFollowupStep({ date_to: "2026-09-15" }, TODAY)).toBe("send");
  });
});

describe("outcomeClickDecision · les 10 cases du tableau 3.4 qui sont du ressort du module", () => {
  const row = (p: Partial<ClickRow>): ClickRow => ({
    status: "accepted", outcome: null, outcome_source: null,
    hasInvoice: false, invoicePaid: false, invoiceCredited: false, ...p,
  });

  it("issue nulle · a eu lieu → apply rented sous verrou outcome_null", () => {
    expect(outcomeClickDecision(row({}), "rented")).toEqual({ kind: "apply", outcome: "rented", expect: "outcome_null" });
  });
  it("issue nulle · pas eu lieu → apply lost sous verrou outcome_null", () => {
    expect(outcomeClickDecision(row({}), "lost")).toEqual({ kind: "apply", outcome: "lost", expect: "outcome_null" });
  });
  it("présumée facturée · a eu lieu → confirm", () => {
    expect(outcomeClickDecision(row({ outcome: "rented", outcome_source: "auto", hasInvoice: true }), "rented")).toEqual({ kind: "confirm" });
  });
  it("présumée facturée · pas eu lieu → credit", () => {
    expect(outcomeClickDecision(row({ outcome: "rented", outcome_source: "auto", hasInvoice: true }), "lost")).toEqual({ kind: "credit" });
  });
  it("présumée, facture payée · a eu lieu → confirm", () => {
    expect(outcomeClickDecision(row({ outcome: "rented", outcome_source: "auto", hasInvoice: true, invoicePaid: true }), "rented")).toEqual({ kind: "confirm" });
  });
  it("présumée, facture payée · pas eu lieu → already_paid, aucune écriture", () => {
    expect(outcomeClickDecision(row({ outcome: "rented", outcome_source: "auto", hasInvoice: true, invoicePaid: true }), "lost")).toEqual({ kind: "already_paid" });
  });
  it("présumée SANS facture (facturation refusée au J1) · pas eu lieu → apply lost sous verrou source_auto", () => {
    expect(outcomeClickDecision(row({ outcome: "rented", outcome_source: "auto" }), "lost")).toEqual({ kind: "apply", outcome: "lost", expect: "source_auto" });
  });
  it("posée par l'admin, même choix → recorded non contestée", () => {
    expect(outcomeClickDecision(row({ outcome: "rented", outcome_source: "admin" }), "rented")).toEqual({ kind: "recorded", contested: false });
  });
  it("posée par l'admin, choix contraire → recorded contestée", () => {
    expect(outcomeClickDecision(row({ outcome: "lost", outcome_source: "admin" }), "rented")).toEqual({ kind: "recorded", contested: true });
  });
  it("déjà confirmée par le loueur (double clic) → recorded non contestée", () => {
    expect(outcomeClickDecision(row({ outcome: "lost", outcome_source: "partner_link" }), "lost")).toEqual({ kind: "recorded", contested: false });
  });
  it("annulée · a eu lieu → cancelled", () => {
    expect(outcomeClickDecision(row({ status: "cancelled" }), "rented")).toEqual({ kind: "cancelled" });
  });
  it("annulée · pas eu lieu → cancelled, même avec une issue posée", () => {
    expect(outcomeClickDecision(row({ status: "cancelled", outcome: "rented", outcome_source: "auto" }), "lost")).toEqual({ kind: "cancelled" });
  });
});

describe("outcomePageState", () => {
  const row = (p: Partial<ClickRow & { outcome_at: string | null }>) => ({
    status: "accepted", outcome: null, outcome_source: null, outcome_at: null,
    hasInvoice: false, invoicePaid: false, invoiceCredited: false, ...p,
  });
  it("issue nulle sans résultat : le formulaire", () => {
    expect(outcomePageState(row({}), null)).toEqual({ kind: "form" });
  });
  it("présumée sans résultat : le formulaire (le lien garde son pouvoir)", () => {
    expect(outcomePageState(row({ outcome: "rented", outcome_source: "auto" }), null)).toEqual({ kind: "form" });
  });
  it("après un POST réussi : done avec le choix enregistré", () => {
    expect(outcomePageState(row({ outcome: "lost", outcome_source: "partner_link", outcome_at: "2026-09-16T06:00:00.000Z" }), "credited")).toEqual({ kind: "done", choice: "lost" });
    expect(outcomePageState(row({ outcome: "rented", outcome_source: "partner_link", outcome_at: "x" }), "applied")).toEqual({ kind: "done", choice: "rented" });
    expect(outcomePageState(row({ outcome: "rented", outcome_source: "partner_link", outcome_at: "x" }), "confirmed")).toEqual({ kind: "done", choice: "rented" });
  });
  it("issue déjà posée par une source non auto : recorded, contestée si le résultat le dit", () => {
    expect(outcomePageState(row({ outcome: "rented", outcome_source: "admin", outcome_at: "2026-09-10T10:00:00.000Z" }), null))
      .toEqual({ kind: "recorded", outcome: "rented", at: "2026-09-10T10:00:00.000Z", contested: false });
    expect(outcomePageState(row({ outcome: "rented", outcome_source: "admin", outcome_at: "x" }), "contested"))
      .toEqual({ kind: "recorded", outcome: "rented", at: "x", contested: true });
    expect(outcomePageState(row({ outcome: "rented", outcome_source: "partner_link", outcome_at: "x" }), "lost_race"))
      .toEqual({ kind: "recorded", outcome: "rented", at: "x", contested: false });
  });
  it("avoir refusé sur une présomption : accusé de réception, jamais le formulaire à nouveau", () => {
    expect(outcomePageState(row({ outcome: "rented", outcome_source: "auto", hasInvoice: true }), "recorded"))
      .toEqual({ kind: "done", choice: "lost" });
  });
  it("recorded sur une issue déjà posée par une autre source garde recorded", () => {
    expect(outcomePageState(row({ outcome: "lost", outcome_source: "partner_link", outcome_at: "x" }), "recorded"))
      .toEqual({ kind: "recorded", outcome: "lost", at: "x", contested: false });
  });
  it("facture payée déclarée non advenue : already_paid", () => {
    expect(outcomePageState(row({ outcome: "rented", outcome_source: "auto", hasInvoice: true, invoicePaid: true }), "already_paid")).toEqual({ kind: "already_paid" });
  });
  it("annulée : cancelled quoi qu'il arrive", () => {
    expect(outcomePageState(row({ status: "cancelled" }), "applied")).toEqual({ kind: "cancelled" });
  });
});

describe("email de question au loueur", () => {
  const mail: OutcomeQuestionMail = {
    requestId: 33, partnerName: "Nikos Zorbas", dateFrom: "2026-09-08", dateTo: "2026-09-15",
    pickupLabel: "Heraklion airport", carModel: "Toyota Yaris automatic", customerName: "Marie Dupont",
    priceEur: 320, outcomeUrl: "https://crete.direct/en/rental-outcome/tok-33", attempt: 1,
    invoice: null, expected: { ratePercent: "10", amountEur: 32 },
  };

  it("sujet : premier envoi, rappel, dernier rappel", () => {
    expect(outcomeQuestionSubject(mail)).toBe("crete.direct · did rental 33 take place? One click");
    expect(outcomeQuestionSubject({ ...mail, attempt: 2 })).toBe("Reminder: crete.direct · did rental 33 take place? One click");
    expect(outcomeQuestionSubject({ ...mail, attempt: 3 })).toBe("Last reminder: crete.direct · did rental 33 take place? One click");
  });
  it("corps : les deux liens vers la PAGE avec ?choice=, jamais vers l'endpoint", () => {
    const body = outcomeQuestionBody(mail);
    expect(body).toContain("https://crete.direct/en/rental-outcome/tok-33?choice=rented");
    expect(body).toContain("https://crete.direct/en/rental-outcome/tok-33?choice=lost");
    expect(body).not.toContain("/api/");
  });
  it("corps : la location, le voyageur abrégé et le prix accepté", () => {
    const body = outcomeQuestionBody(mail);
    expect(body).toContain("Hi Nikos,");
    expect(body).toContain("Rental 33 · 08/09 to 15/09 · Heraklion airport · Toyota Yaris automatic");
    expect(body).toContain("Traveller: Marie D. · Price accepted: 320.00 EUR");
  });
  it("population A : annonce la facture à venir, aucune ligne de facture émise", () => {
    const body = outcomeQuestionBody(mail);
    expect(body).toContain("If it took place, the 10% commission invoice (32.00 EUR) follows automatically.");
    expect(body).not.toContain("was issued on the first day");
  });
  it("population B : nomme la facture émise et promet l'avoir, rien sur une facture à venir", () => {
    const body = outcomeQuestionBody({ ...mail, invoice: { number: "NOVAI-CD-2026-002", amountEur: 32 }, expected: null });
    expect(body).toContain("Invoice NOVAI-CD-2026-002 (32.00 EUR) was issued on the first day of the rental.");
    expect(body).toContain("the second link cancels it by credit note, nothing to pay");
    expect(body).not.toContain("follows automatically");
  });
  it("troisième email : annonce l'appel à date_to + 10 j", () => {
    expect(outcomeQuestionBody({ ...mail, attempt: 3 })).toContain("Without an answer by 25/09, we will call you.");
    expect(outcomeQuestionBody({ ...mail, attempt: 2 })).not.toContain("we will call you");
  });
  it("aucun tiret cadratin dans les trois emails (même règle que check-campagne)", () => {
    for (const attempt of [1, 2, 3] as const) {
      expect(outcomeQuestionSubject({ ...mail, attempt })).not.toContain(EMDASH);
      expect(outcomeQuestionBody({ ...mail, attempt })).not.toContain(EMDASH);
    }
  });
  it("signature crete.direct, sans le modèle quand il est inconnu", () => {
    const body = outcomeQuestionBody({ ...mail, carModel: null });
    expect(body).toContain("Rental 33 · 08/09 to 15/09 · Heraklion airport\n");
    expect(body.endsWith("Kami\ncrete.direct")).toBe(true);
  });
});

describe("libellés du back-office", () => {
  it("badge : présumée, confirmée, admin, loueur", () => {
    expect(outcomeBadgeLabel("rented", "auto")).toBe("louée · présumée J1");
    expect(outcomeBadgeLabel("rented", "partner_link")).toBe("louée · confirmée loueur");
    expect(outcomeBadgeLabel("rented", "admin")).toBe("louée · admin");
    expect(outcomeBadgeLabel("lost", "partner_link")).toBe("perdue · loueur");
    expect(outcomeBadgeLabel("lost", "admin")).toBe("perdue · admin");
  });
  it("badge : source inconnue (avant migration) rend le libellé nu", () => {
    expect(outcomeBadgeLabel("rented", null)).toBe("louée");
    expect(outcomeBadgeLabel("lost", undefined)).toBe("perdue");
  });
  it("badge : rien sans issue", () => {
    expect(outcomeBadgeLabel(null, null)).toBeNull();
    expect(outcomeBadgeLabel(undefined, "auto")).toBeNull();
  });
  it("ligne d'état : rien avant le premier envoi", () => {
    expect(followupStatusLine({ date_to: "2026-09-15" })).toBeNull();
    expect(followupStatusLine({ date_to: "2026-09-15", outcome_followup_count: 0 })).toBeNull();
  });
  it("ligne d'état : envois et dernière date", () => {
    expect(followupStatusLine({ date_to: "2026-09-15", outcome_followup_count: 1, outcome_followup_sent_at: "2026-09-12T06:20:00.000Z" }))
      .toBe("question d'issue : 1/3 envoyée, dernière le 12/09/2026");
    expect(followupStatusLine({ date_to: "2026-09-15", outcome_followup_count: 2, outcome_followup_sent_at: "2026-09-12T06:20:00.000Z" }))
      .toBe("question d'issue : 2/3 envoyées, dernière le 12/09/2026");
  });
  it("ligne d'état : l'escalade prime", () => {
    expect(followupStatusLine({ date_to: "2026-09-15", outcome_followup_count: 3, outcome_followup_sent_at: "2026-09-12T06:20:00.000Z", outcome_followup_escalated_at: "2026-09-18T06:20:00.000Z" }))
      .toBe("question d'issue : escaladée le 18/09/2026");
  });
});
