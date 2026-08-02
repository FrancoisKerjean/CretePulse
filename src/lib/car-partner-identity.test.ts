// Saisie de l identite legale d un loueur. Ce module ne decide RIEN de la
// conformite d une facture : c est `partnerBillingIdentity` (car-invoice.ts) qui
// la decide, et l ecran doit refleter SA distinction requis/optionnel, pas en
// inventer une seconde qui deriverait le jour ou la premiere bouge.
import { describe, it, expect } from "vitest";
import {
  identityFormFields,
  identityStatus,
  buildIdentityPatch,
  todayAthens,
  IDENTITY_FIELD_LABELS,
} from "./car-partner-identity";
import { partnerBillingIdentity } from "./car-invoice";

const FULL = {
  legal_name: "Lux Trans IKE",
  legal_form: "Private company (IKE), Greece",
  address_line: "Leoforos Knossou 12",
  postal_code: "71306",
  city: "Heraklion",
  country: "Greece",
  vat_id: "EL801122501",
  vat_verified_at: "2026-07-30",
};

describe("identityFormFields", () => {
  it("marque requis EXACTEMENT les champs que partnerBillingIdentity exige", () => {
    // Derive, jamais recopie : si REQUIRED_BILLING_FIELDS bouge dans
    // car-invoice.ts, l ecran suit sans qu on y touche. Une seconde liste
    // recopiee ici deriverait en silence, et l ecran demanderait un champ que
    // la garde n exige pas (ou l inverse, bien pire).
    const res = partnerBillingIdentity({});
    const required = res.ok ? [] : res.missing;
    const marked = identityFormFields().filter((f) => f.required).map((f) => f.name);
    expect([...marked].sort()).toEqual([...required].sort());
  });

  it("laisse la forme juridique optionnelle", () => {
    // legal_form est deliberement hors des champs requis (cf. car-invoice.ts) :
    // l exiger bloquerait la facturation d un loueur parfaitement identifie.
    const legalForm = identityFormFields().find((f) => f.name === "legal_form");
    expect(legalForm?.required).toBe(false);
  });

  it("ne propose aucun champ que la facture n imprime pas", () => {
    const names = identityFormFields().map((f) => f.name);
    expect(names).toEqual([
      "legal_name", "legal_form", "address_line", "postal_code", "city", "country", "vat_id",
    ]);
  });

  it("annonce ses exemples COMME des exemples", () => {
    // Defaut trouve sur la planche, qu aucun test ne voyait : les exemples sont
    // ceux du seul loueur renseigne en base, et une fiche VIDE se lisait comme
    // une fiche REMPLIE au nom d un AUTRE loueur. Sur un formulaire dont tout
    // l objet est l exactitude juridique, c est le pire malentendu possible.
    for (const f of identityFormFields()) {
      expect(f.placeholder.startsWith("ex. ")).toBe(true);
    }
  });

  it("porte un libelle francais pour chaque champ", () => {
    for (const f of identityFormFields()) {
      expect(IDENTITY_FIELD_LABELS[f.name]).toBeTruthy();
      expect(f.label).toBe(IDENTITY_FIELD_LABELS[f.name]);
    }
  });
});

describe("identityStatus", () => {
  it("dit complete quand la facture peut etre emise", () => {
    expect(identityStatus(FULL).complete).toBe(true);
    expect(identityStatus(FULL).missing).toEqual([]);
  });

  it("nomme les champs manquants en francais", () => {
    const st = identityStatus({ ...FULL, city: "  ", vat_id: null });
    expect(st.complete).toBe(false);
    expect(st.missing).toEqual(["city", "vat_id"]);
    expect(st.missingLabels).toEqual(["ville", "numéro de TVA intracommunautaire"]);
  });

  it("une fiche vide est incomplete, pas plantee", () => {
    expect(identityStatus(null).complete).toBe(false);
    expect(identityStatus(undefined).missing.length).toBeGreaterThan(0);
  });

  it("une forme juridique absente ne rend PAS la fiche incomplete", () => {
    expect(identityStatus({ ...FULL, legal_form: null }).complete).toBe(true);
  });
});

describe("buildIdentityPatch · champs texte", () => {
  const base = { vatVerified: false, current: null, today: "2026-08-01" };

  it("ecrit les sept colonnes, meme celles laissees vides", () => {
    // Un champ efface a l ecran doit s effacer en base : rendre un patch partiel
    // laisserait l ancienne valeur, et l ecran mentirait sur ce qui est stocke.
    const patch = buildIdentityPatch({ ...base, values: {} });
    expect(Object.keys(patch).sort()).toEqual([
      "address_line", "city", "country", "legal_form", "legal_name",
      "postal_code", "vat_id", "vat_verified_at",
    ]);
  });

  it("rend null sur une valeur vide plutot qu une chaine vide", () => {
    // Une chaine vide passe pour renseignee a l oeil dans la base et se lit
    // « champ rempli » : seul null dit « pas renseigne ».
    const patch = buildIdentityPatch({ ...base, values: { city: "   ", legal_name: "" } });
    expect(patch.city).toBeNull();
    expect(patch.legal_name).toBeNull();
  });

  it("coupe les espaces de bord", () => {
    const patch = buildIdentityPatch({ ...base, values: { city: "  Heraklion  " } });
    expect(patch.city).toBe("Heraklion");
  });

  it("stocke le numero de TVA sous la forme EXACTE que la facture imprimera", () => {
    // Ce qui est stocke doit etre ce qui s imprime : sinon la facture porte
    // « EL801122501 » et la base « el 801 122 501 », et aucun rapprochement
    // (VIES, DES) ne retrouve le numero.
    const patch = buildIdentityPatch({ ...base, values: { vat_id: " el 801 122 501 " } });
    const printed = partnerBillingIdentity({ ...FULL, vat_id: " el 801 122 501 " });
    expect(patch.vat_id).toBe(printed.ok ? printed.identity.vatId : "(non conforme)");
    expect(patch.vat_id).toBe("EL801122501");
  });
});

describe("buildIdentityPatch · vat_verified_at", () => {
  // ⛔ Cette colonne n est PAS un champ comme les autres : elle imprime sur la
  // facture « verified against the European Commission VIES database on <date>
  // and returned as valid ». La poser sans avoir fait le controle fabrique un
  // mensonge sur une piece comptable.
  const values = { vat_id: "EL801122501" };

  it("ne pose rien tant que le controle n est pas declare", () => {
    const patch = buildIdentityPatch({ values, vatVerified: false, current: null, today: "2026-08-01" });
    expect(patch.vat_verified_at).toBeNull();
  });

  it("date le controle du jour ou il est declare", () => {
    const patch = buildIdentityPatch({ values, vatVerified: true, current: null, today: "2026-08-01" });
    expect(patch.vat_verified_at).toBe("2026-08-01");
  });

  it("CONSERVE la date d origine quand le numero n a pas bouge", () => {
    // La verification a eu lieu ce jour-la, pas aujourd hui. Re-dater a chaque
    // enregistrement du formulaire ferait vieillir un controle reel en fausse
    // fraicheur, et la facture affirmerait une date ou personne n a rien fait.
    const patch = buildIdentityPatch({
      values, vatVerified: true,
      current: { vat_id: "EL801122501", vat_verified_at: "2026-07-30" },
      today: "2026-08-01",
    });
    expect(patch.vat_verified_at).toBe("2026-07-30");
  });

  it("EFFACE l attestation quand le numero de TVA change", () => {
    // Le controle VIES portait sur l ANCIEN numero : le garder ferait affirmer
    // a la facture qu un numero jamais verifie l a ete.
    const patch = buildIdentityPatch({
      values: { vat_id: "EL999888777" }, vatVerified: false,
      current: { vat_id: "EL801122501", vat_verified_at: "2026-07-30" },
      today: "2026-08-01",
    });
    expect(patch.vat_verified_at).toBeNull();
  });

  it("re-date au jour du nouveau controle quand le numero change ET que le controle est declare", () => {
    const patch = buildIdentityPatch({
      values: { vat_id: "EL999888777" }, vatVerified: true,
      current: { vat_id: "EL801122501", vat_verified_at: "2026-07-30" },
      today: "2026-08-01",
    });
    expect(patch.vat_verified_at).toBe("2026-08-01");
  });

  it("retire l attestation quand elle est decochee", () => {
    // Seul chemin pour corriger une attestation posee par erreur.
    const patch = buildIdentityPatch({
      values, vatVerified: false,
      current: { vat_id: "EL801122501", vat_verified_at: "2026-07-30" },
      today: "2026-08-01",
    });
    expect(patch.vat_verified_at).toBeNull();
  });

  it("REFUSE d attester un numero inexploitable, meme coche", () => {
    // « a demander », « N/A », un numero grec sans son prefixe : la facture ne
    // peut pas affirmer avoir verifie ca contre VIES.
    for (const bad of ["", "a demander", "N/A", "801122501"]) {
      const patch = buildIdentityPatch({
        values: { vat_id: bad }, vatVerified: true, current: null, today: "2026-08-01",
      });
      expect(patch.vat_verified_at).toBeNull();
    }
  });

  it("un numero normalise par la saisie reste reconnu comme inchange", () => {
    // « el 801 122 501 » et « EL801122501 » sont le MEME numero : re-dater le
    // controle sur une simple difference de frappe serait faux.
    const patch = buildIdentityPatch({
      values: { vat_id: " el 801 122 501 " }, vatVerified: true,
      current: { vat_id: "EL801122501", vat_verified_at: "2026-07-30" },
      today: "2026-08-01",
    });
    expect(patch.vat_verified_at).toBe("2026-07-30");
  });
});

describe("todayAthens", () => {
  it("rend une date civile YYYY-MM-DD", () => {
    expect(todayAthens(new Date("2026-08-01T09:00:00.000Z"))).toBe("2026-08-01");
  });

  it("suit le fuseau d Athenes, pas UTC", () => {
    // 22h00 UTC le 31/07 = 01h00 le 01/08 a Athenes. La colonne est une DATE
    // civile : la lire en UTC daterait le controle de la veille.
    expect(todayAthens(new Date("2026-07-31T22:00:00.000Z"))).toBe("2026-08-01");
  });
});
