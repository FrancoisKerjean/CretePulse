import { describe, it, expect } from "vitest";
import {
  isInvoiceable,
  invoiceAmounts,
  creditNumberFor,
  creditMailBody,
  invoiceAdminState,
  ratePercentLabel,
  partnerBillingIdentity,
  type InvoiceCandidate,
} from "./car-invoice";

const START = "2026-08-05";
const TODAY = "2026-08-07";

const ok: InvoiceCandidate = {
  id: 39,
  accepted_at: "2026-07-26T12:00:00Z",
  outcome: null,
  date_from: "2026-08-07",
  booking_paid_at: null,
  quoted_by_partner_id: 16,
  quoted_price: 200,
};

describe("isInvoiceable", () => {
  it("facture une location qui demarre aujourd hui", () => {
    expect(isInvoiceable(ok, TODAY, START)).toBe(true);
  });

  it("rattrape une location dont le depart est passe", () => {
    // Le cron est son propre rattrapage : une journee de panne ne doit pas
    // perdre une facture definitivement.
    expect(isInvoiceable({ ...ok, date_from: "2026-08-06" }, TODAY, START)).toBe(true);
  });

  it("ne facture pas une location qui n a pas encore demarre", () => {
    expect(isInvoiceable({ ...ok, date_from: "2026-08-08" }, TODAY, START)).toBe(false);
  });

  it("ne rattrape jamais l historique anterieur a la mise en service", () => {
    // car_requests id=27 a ete facturee a la main le 30/07 (NOVAI-2026-003).
    expect(isInvoiceable({ ...ok, date_from: "2026-07-30" }, TODAY, START)).toBe(false);
  });

  it("ne ressuscite pas une location deja perdue", () => {
    // Sans cette garde, une location marquee « lost » garde son accepted_at et
    // sa date_from passee : le cron la repasserait en « rented » et facturerait
    // un loueur pour une location dont on sait qu elle n a pas eu lieu.
    expect(isInvoiceable({ ...ok, outcome: "lost" }, TODAY, START)).toBe(false);
    expect(isInvoiceable({ ...ok, outcome: "rented" }, TODAY, START)).toBe(false);
  });

  it("ne facture pas une location deja payee en ligne", () => {
    // Commission deja prelevee par le tunnel de paiement : facturer serait
    // encaisser deux fois.
    expect(isInvoiceable({ ...ok, booking_paid_at: "2026-08-01T09:00:00Z" }, TODAY, START)).toBe(false);
  });

  it("ne facture rien sans loueur gagnant ni sans prix accepte", () => {
    expect(isInvoiceable({ ...ok, quoted_by_partner_id: null }, TODAY, START)).toBe(false);
    expect(isInvoiceable({ ...ok, quoted_price: null }, TODAY, START)).toBe(false);
    expect(isInvoiceable({ ...ok, accepted_at: null }, TODAY, START)).toBe(false);
  });
});

describe("invoiceAmounts", () => {
  it("calcule la commission sur le prix du devis accepte", () => {
    expect(invoiceAmounts(200, 0.1)).toEqual({ base: 200, rate: 0.1, amount: 20 });
  });

  it("arrondit au centime", () => {
    expect(invoiceAmounts(333.33, 0.1)).toEqual({ base: 333.33, rate: 0.1, amount: 33.33 });
  });

  it("rend null sous le minimum encaissable par Stripe", () => {
    expect(invoiceAmounts(4, 0.1)).toBeNull();
  });
});

describe("creditNumberFor", () => {
  it("derive le numero d avoir de la facture, sans consommer la serie", () => {
    expect(creditNumberFor("NOVAI-CD-2026-004")).toBe("NOVAI-CD-2026-004-A");
  });
});

describe("creditMailBody", () => {
  it("nomme la facture annulee et la raison", () => {
    const body = creditMailBody({
      creditNumber: "NOVAI-CD-2026-004-A",
      number: "NOVAI-CD-2026-004",
      partnerName: "Luxtrans Crete",
      amountEur: 20,
      reason: "rental did not take place",
    });
    expect(body).toContain("NOVAI-CD-2026-004-A");
    expect(body).toContain("NOVAI-CD-2026-004");
    expect(body).toContain("rental did not take place");
    expect(body).toContain("nothing to pay");
  });
});

// ── Etat d une facture vu du back-office ─────────────────────────────────────
// Le back-office affiche deux boutons (avoir, renvoi) et un etat. Les conditions
// d affichage vivent ici, pures, plutot que dans le JSX : un bouton qui
// s affiche alors que l action le refusera est un mensonge d interface, et un
// bouton absent alors que l action marcherait est un rattrapage perdu.
describe("invoiceAdminState", () => {
  const SENT = {
    number: "NOVAI-CD-2026-004",
    sent_at: "2026-08-10T05:00:00.000Z",
    paid_at: null,
    credited_at: null,
    credit_number: null,
  };

  it("rend null quand aucune facture n existe : rien a montrer, rien a cliquer", () => {
    expect(invoiceAdminState(null)).toBeNull();
    expect(invoiceAdminState(undefined)).toBeNull();
  });

  it("signale en ALERTE une facture jamais envoyee, et ouvre les deux gestes", () => {
    // sent_at NULL : la facture porte son numero mais l email n est jamais parti,
    // et le cron ne repassera jamais dessus. C est l etat qui appelle une action.
    const s = invoiceAdminState({ ...SENT, sent_at: null })!;
    expect(s.tone).toBe("alert");
    expect(s.label).toContain("jamais envoyée");
    expect(s.number).toBe("NOVAI-CD-2026-004");
    expect(s.canResend).toBe(true);
    expect(s.canCredit).toBe(true);
  });

  it("date l envoi d une facture partie mais non reglee, et ouvre les deux gestes", () => {
    const s = invoiceAdminState(SENT)!;
    expect(s.tone).toBe("due");
    expect(s.label).toContain("envoyée le 10/08/2026");
    expect(s.canResend).toBe(true);
    expect(s.canCredit).toBe(true);
  });

  it("ferme les deux gestes sur une facture reglee", () => {
    // resendCommissionInvoice et creditCommissionInvoice refusent toutes deux
    // already_paid : afficher le bouton serait promettre un refus.
    const s = invoiceAdminState({ ...SENT, paid_at: "2026-08-11T09:00:00.000Z" })!;
    expect(s.tone).toBe("ok");
    expect(s.label).toContain("payée le 11/08/2026");
    expect(s.canResend).toBe(false);
    expect(s.canCredit).toBe(false);
  });

  it("ferme les deux gestes sur une facture annulee, en nommant l avoir", () => {
    const s = invoiceAdminState({
      ...SENT,
      credited_at: "2026-08-11T09:00:00.000Z",
      credit_number: "NOVAI-CD-2026-004-A",
    })!;
    expect(s.tone).toBe("muted");
    expect(s.label).toContain("NOVAI-CD-2026-004-A");
    expect(s.canResend).toBe(false);
    expect(s.canCredit).toBe(false);
  });

  it("l avoir prime sur le paiement : une facture avoiree ne se renvoie pas", () => {
    // Cas theorique (creditCommissionInvoice refuse d avoirer une facture
    // payee), mais si la base porte les deux, l etat le plus terminal gagne.
    const s = invoiceAdminState({
      ...SENT,
      paid_at: "2026-08-11T09:00:00.000Z",
      credited_at: "2026-08-12T09:00:00.000Z",
      credit_number: "NOVAI-CD-2026-004-A",
    })!;
    expect(s.tone).toBe("muted");
    expect(s.canResend).toBe(false);
    expect(s.canCredit).toBe(false);
  });

  it("nomme l avoir « avoir » meme quand son numero manque", () => {
    const s = invoiceAdminState({ ...SENT, credited_at: "2026-08-11T09:00:00.000Z" })!;
    expect(s.label).toContain("avoir");
    expect(s.canCredit).toBe(false);
  });
});

describe("ratePercentLabel", () => {
  // Sur une piece comptable, deux nombres qui ne se recoupent pas, c est une
  // contestation : la page affichait le taux en toFixed(0), donc un taux de
  // 7,5 % s imprimait « 8% » juste au-dessus d un total calcule a 7,5 %.
  it("garde un taux entier propre", () => {
    expect(ratePercentLabel(0.1)).toBe("10");
    expect(ratePercentLabel(0.15)).toBe("15");
    expect(ratePercentLabel(0.2)).toBe("20");
  });

  it("montre la decimale d un taux fractionnaire au lieu de l arrondir", () => {
    expect(ratePercentLabel(0.075)).toBe("7.5");
    expect(ratePercentLabel(0.125)).toBe("12.5");
    expect(ratePercentLabel(0.0825)).toBe("8.25");
  });

  it("le taux affiche redonne bien le montant affiche", () => {
    // Le seul controle qui compte pour le loueur : base x taux = total.
    for (const [base, rate] of [
      [210, 0.075],
      [310, 0.1],
      [480, 0.125],
    ] as const) {
      const shown = Number(ratePercentLabel(rate));
      expect(Math.round(base * (shown / 100) * 100) / 100).toBe(
        Math.round(base * rate * 100) / 100,
      );
    }
  });

  it("absorbe le bruit du flottant sans inventer de decimales", () => {
    // `rate` naît d une division (amount / base) : 0.1 * 100 vaut
    // 10.000000000000002 en JS, et un String() nu l afficherait tel quel.
    expect(ratePercentLabel(31 / 310)).toBe("10");
    expect(ratePercentLabel(31.5 / 210)).toBe("15");
  });

  it("un taux absent ou aberrant ne casse pas la facture", () => {
    expect(ratePercentLabel(0)).toBe("0");
    expect(ratePercentLabel(Number.NaN)).toBe("0");
  });
});

// ── Identite de facturation du loueur ────────────────────────────────────────
// NovAI est francaise, le loueur est grec : la commission est une prestation de
// services intra-UE, autoliquidee par le preneur. Cette mention EXIGE le numero
// de TVA du client sur la piece, et l adresse complete du client est une mention
// obligatoire de toute facture. Un loueur dont l identite legale est incomplete
// ne peut donc pas etre facture : mieux vaut ne rien emettre qu emettre une
// piece fausse chez une vraie entreprise.

const IDENTITY = {
  name: "cretecar.rent",
  legal_name: "Lux Trans IKE",
  legal_form: "Private company (IKE), Greece",
  address_line: "1922 Street, No 10",
  postal_code: "71601",
  city: "Heraklion",
  country: "Greece",
  vat_id: "EL801122501",
  vat_verified_at: "2026-07-30",
};

describe("partnerBillingIdentity", () => {
  it("rend l identite complete quand tout est renseigne", () => {
    const res = partnerBillingIdentity(IDENTITY);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.identity).toEqual({
      legalName: "Lux Trans IKE",
      legalForm: "Private company (IKE), Greece",
      addressLine: "1922 Street, No 10",
      postalCode: "71601",
      city: "Heraklion",
      country: "Greece",
      vatId: "EL801122501",
      vatVerifiedAt: "2026-07-30",
    });
  });

  it("refuse un loueur sans numero de TVA, le champ le plus indispensable", () => {
    // Sans lui la mention d autoliquidation est impossible a porter, et la
    // declaration europeenne de services ne peut pas etre deposee.
    const res = partnerBillingIdentity({ ...IDENTITY, vat_id: null });
    expect(res).toEqual({ ok: false, missing: ["vat_id"] });
  });

  it.each([
    ["legal_name", { legal_name: null }],
    ["address_line", { address_line: null }],
    ["postal_code", { postal_code: null }],
    ["city", { city: null }],
    ["country", { country: null }],
  ])("refuse un loueur sans %s : mention obligatoire de la facture", (field, patch) => {
    const res = partnerBillingIdentity({ ...IDENTITY, ...patch });
    expect(res).toEqual({ ok: false, missing: [field] });
  });

  it("la forme juridique n est PAS exigee : elle est souvent dans la raison sociale", () => {
    // « Lux Trans IKE » porte deja son IKE. Exiger la colonne bloquerait la
    // facturation d un loueur parfaitement identifiable, alors qu aucune mention
    // obligatoire ne manque. La page l imprime si elle existe, et se tait sinon.
    const res = partnerBillingIdentity({ ...IDENTITY, legal_form: null });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.identity.legalForm).toBeNull();
  });

  it("la date de verification VIES n est pas exigee non plus", () => {
    // Elle ne conditionne pas la conformite de la piece : elle date une
    // verification qui a REELLEMENT eu lieu, et la page ne l affirme que dans ce
    // cas. Aucune verification enregistree = la phrase ne s imprime pas.
    const res = partnerBillingIdentity({ ...IDENTITY, vat_verified_at: null });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.identity.vatVerifiedAt).toBeNull();
  });

  it("liste TOUT ce qui manque, dans l ordre du bloc client", () => {
    // Un motif qui ne dit qu un champ ferait faire trois allers-retours a qui
    // remplit la fiche.
    expect(partnerBillingIdentity({})).toEqual({
      ok: false,
      missing: ["legal_name", "address_line", "postal_code", "city", "country", "vat_id"],
    });
  });

  it("un loueur absent est incomplet, pas une exception", () => {
    expect(partnerBillingIdentity(null).ok).toBe(false);
    expect(partnerBillingIdentity(undefined).ok).toBe(false);
  });

  it("une valeur faite d espaces ne compte pas comme renseignee", () => {
    const res = partnerBillingIdentity({ ...IDENTITY, city: "   " });
    expect(res).toEqual({ ok: false, missing: ["city"] });
  });

  it("rogne les espaces autour des valeurs gardees", () => {
    const res = partnerBillingIdentity({ ...IDENTITY, city: "  Heraklion  " });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.identity.city).toBe("Heraklion");
  });

  it.each(["N/A", "-", "TBD", "a demander", "801122501", "EL"])(
    "traite un numero de TVA bidon (%s) comme absent",
    (vat) => {
      // Un fourre-tout saisi a la place du numero produirait une facture qui
      // PORTE une mention d autoliquidation sans identifiant valide : pire
      // qu une facture non emise.
      const res = partnerBillingIdentity({ ...IDENTITY, vat_id: vat });
      expect(res).toEqual({ ok: false, missing: ["vat_id"] });
    },
  );

  it.each(["IE1234567FA", "NL123456789B01", "FR45994765857"])(
    "accepte les autres formes de l Union (%s), pas seulement la grecque",
    (vat) => {
      // Le controle de forme ne doit pas se resserrer sur EL + 9 chiffres : un
      // loueur immatricule ailleurs dans l Union se ferait refuser sans motif.
      expect(partnerBillingIdentity({ ...IDENTITY, vat_id: vat }).ok).toBe(true);
    },
  );

  it("accepte un numero de TVA ecrit avec des espaces, et le normalise", () => {
    const res = partnerBillingIdentity({ ...IDENTITY, vat_id: " el 801122501 " });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.identity.vatId).toBe("EL801122501");
  });
});
