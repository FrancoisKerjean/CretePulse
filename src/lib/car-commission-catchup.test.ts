// Rattrapage d une facture restee en souffrance. `setOutcome` bascule la demande
// en « rented » AVANT de facturer, et la facturation peut refuser (fiche loueur
// incomplete, panne d email, refus Stripe). La ligne porte alors outcome =
// 'rented' SANS facture, et le cron ne repassera JAMAIS dessus : il ne prend que
// `outcome IS NULL`. Sans ce geste, completer la fiche du loueur apres coup ne
// declenche rien et le travail est perdu en silence.
import { describe, it, expect } from "vitest";
import { commissionCatchUp, commissionOutcomeMessage } from "./car-commission-catchup";

const RENTED = {
  id: 42,
  outcome: "rented",
  commission_eur: 31,
  commission_paid_at: null,
  commission_session_id: null,
  quoted_by_partner_id: 111,
  commission_requested_at: null as string | null,
};

const WINNER = {
  legal_name: "Lux Trans IKE",
  address_line: "Leoforos Knossou 12",
  postal_code: "71306",
  city: "Heraklion",
  country: "Greece",
  vat_id: "EL801122501",
};

const INVOICE = {
  number: "NOVAI-CD-2026-004",
  sent_at: "2026-08-10T05:00:01.000Z",
  paid_at: null,
  credited_at: null,
  credit_number: null,
};

describe("commissionCatchUp", () => {
  it("propose d emettre une location louee, sans facture, loueur complet", () => {
    expect(commissionCatchUp(RENTED, null, WINNER)).toEqual({ kind: "emit" });
  });

  it("ne propose RIEN quand une facture existe deja", () => {
    // Ce cas appartient aux boutons « Renvoyer » et « avoir » : deux gestes
    // pour la meme ligne mentiraient sur ce qui va se passer.
    expect(commissionCatchUp(RENTED, INVOICE, WINNER)).toBeNull();
  });

  it("ne propose rien sur une facture jamais envoyee : c est « Renvoyer » qui la rattrape", () => {
    expect(commissionCatchUp(RENTED, { ...INVOICE, sent_at: null }, WINNER)).toBeNull();
  });

  it("ne propose rien tant que l issue n est pas « louee »", () => {
    expect(commissionCatchUp({ ...RENTED, outcome: null }, null, WINNER)).toBeNull();
    expect(commissionCatchUp({ ...RENTED, outcome: "lost" }, null, WINNER)).toBeNull();
  });

  it("ne propose rien sans loueur gagnant identifie", () => {
    expect(commissionCatchUp({ ...RENTED, quoted_by_partner_id: null }, null, WINNER)).toBeNull();
    expect(commissionCatchUp(RENTED, null, null)).toBeNull();
  });

  it("ne propose rien quand la commission est deja encaissee", () => {
    expect(commissionCatchUp({ ...RENTED, commission_paid_at: "2026-08-11T09:00:00.000Z" }, null, WINNER)).toBeNull();
  });

  it("ne propose rien quand le loueur a deja ouvert un paiement", () => {
    // `commission_session_id` non nul = le loueur a DEJA clique sur « Pay by
    // card » depuis sa page facture : il a donc bien recu une facture.
    expect(commissionCatchUp({ ...RENTED, commission_session_id: "cs_test_1" }, null, WINNER)).toBeNull();
  });

  it("ne propose rien sous le minimum encaissable par Stripe", () => {
    expect(commissionCatchUp({ ...RENTED, commission_eur: 0.2 }, null, WINNER)).toBeNull();
  });

  it("dit ce qui manque au lieu d offrir un bouton qui sera refuse", () => {
    // Doctrine de l ecran (cf. invoiceAdminState) : un bouton qui s affiche
    // alors que l action le refusera est un mensonge d interface.
    const st = commissionCatchUp(RENTED, null, { ...WINNER, city: null, vat_id: null });
    expect(st).toEqual({ kind: "identity_incomplete", missing: ["city", "vat_id"] });
  });

  it("le verrou pose sans facture prime sur tout le reste", () => {
    // `commission_requested_at` rempli SANS facture = verrou pris puis jamais
    // relache (releaseLock refuse par la base). Reclamer « completez la fiche »
    // serait une fausse promesse : tant que le verrou tient, requestCommission
    // rendra `already_requested` quoi qu on remplisse.
    const st = commissionCatchUp(
      { ...RENTED, commission_requested_at: "2026-08-10T05:00:00.000Z" },
      null,
      { ...WINNER, vat_id: null },
    );
    expect(st).toEqual({ kind: "locked" });
  });

  it("un verrou pose avec loueur complet reste un verrou, pas un bouton", () => {
    const st = commissionCatchUp(
      { ...RENTED, commission_requested_at: "2026-08-10T05:00:00.000Z" },
      null,
      WINNER,
    );
    expect(st).toEqual({ kind: "locked" });
  });
});

describe("commissionOutcomeMessage", () => {
  it("ne dit RIEN sur un succes : la facture et son numero apparaissent a l ecran", () => {
    expect(commissionOutcomeMessage({ status: "requested", invoiceNumber: "NOVAI-CD-2026-004" })).toBeNull();
  });

  it("dit que le systeme est desarme, sinon le clic semble sans effet", () => {
    // Etat NORMAL aujourd hui (CAR_COMMISSION_ENABLED absent) : rien n est
    // lu, rien n est ecrit, et sans message l ecran serait rigoureusement
    // identique avant et apres le clic.
    const m = commissionOutcomeMessage({ status: "disabled" });
    expect(m).toContain("CAR_COMMISSION_ENABLED");
  });

  it("nomme les champs manquants d une fiche loueur incomplete", () => {
    const m = commissionOutcomeMessage({
      status: "partner_identity_incomplete",
      missing: ["address_line", "vat_id"],
    });
    expect(m).toContain("adresse");
    expect(m).toContain("numéro de TVA");
  });

  it("distingue le verrou deja pris d une panne", () => {
    expect(commissionOutcomeMessage({ status: "already_requested" })).toMatch(/déjà/);
  });

  it("dit qu il n y a rien a facturer", () => {
    expect(commissionOutcomeMessage({ status: "skipped" })).toBeTruthy();
  });

  it.each([
    ["partner_without_email", /email/i],
    ["invoice_creation_failed", /facture/i],
    ["invoice_mail_refused", /Renvoyer/],
    ["invoice_sent_not_recorded", /jamais envoyée/],
    ["lock_write_failed", /verrou/],
  ])("explique l echec %s", (code, pattern) => {
    expect(commissionOutcomeMessage({ status: "failed", code })).toMatch(pattern);
  });

  it("ne laisse aucun code d echec sans message", () => {
    const m = commissionOutcomeMessage({ status: "failed", code: "code_jamais_vu" });
    expect(m).toContain("code_jamais_vu");
  });
});
