import { describe, it, expect } from "vitest";
import { validateCarLead, isCallablePhone } from "@/lib/car-lead";

// Pourquoi ce test existe : le téléphone était optionnel, et 4 des 6 demandes
// acceptées arrivaient chez le loueur sans aucun canal de rappel. Zakros Tours
// l'a signalé le 07/08/2026 sur la demande 33 (« If we had mobile numbers it
// would be helpful ») après 9 jours de silence de son client.
// Le loueur reçoit les coordonnées APRÈS acceptation : sans téléphone, sa seule
// voie est un email vers un inconnu, qui part en spam.

const LEAD_VALIDE = {
  pickup: "heraklion",
  carType: "city",
  name: "Firmino Facchin",
  email: "client@example.com",
  dateFrom: "2026-09-08",
  dateTo: "2026-09-16",
  timeFrom: "10:00",
  timeTo: "19:00",
  phone: "+39 333 1234567",
};

describe("validateCarLead — le téléphone est obligatoire", () => {
  it("accepte une demande qui porte un téléphone", () => {
    const r = validateCarLead({ ...LEAD_VALIDE });
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.row.customer_phone).toBe("+39 333 1234567");
  });

  it("refuse une demande sans champ téléphone", () => {
    const { phone: _omis, ...sansPhone } = LEAD_VALIDE;
    const r = validateCarLead(sansPhone);
    expect(r.kind).toBe("error");
    if (r.kind === "error") {
      expect(r.status).toBe(422);
      expect(r.error).toBe("Phone required");
    }
  });

  it("refuse un téléphone vide ou fait d'espaces", () => {
    for (const phone of ["", "   ", "\t"]) {
      const r = validateCarLead({ ...LEAD_VALIDE, phone });
      expect(r.kind).toBe("error");
    }
  });

  it("refuse un téléphone trop court pour être rappelable", () => {
    // Un « - » ou « 00 » passe un test de non-vide mais ne rappelle personne.
    for (const phone of ["-", "00", "n/a", "12345"]) {
      const r = validateCarLead({ ...LEAD_VALIDE, phone });
      expect(r.kind).toBe("error");
    }
  });

  it("laisse le honeypot primer sur le téléphone manquant", () => {
    // Un bot ne doit jamais apprendre quel champ manque : succès silencieux.
    const { phone: _omis, ...sansPhone } = LEAD_VALIDE;
    const r = validateCarLead({ ...sansPhone, website: "http://spam.example" });
    expect(r.kind).toBe("honeypot");
  });
});

// Le wizard doit desactiver « Envoyer » sur la MEME regle que le serveur.
// Deux implementations derivent : le client laisserait passer ce que le serveur
// refuse, et l'utilisateur se prendrait un « Invalid request » sans savoir
// quel champ corriger.
describe("isCallablePhone — une seule règle, partagée client et serveur", () => {
  const ACCEPTES = ["+39 333 1234567", "6978186250", "+30 28970 22137", "0612345678"];
  const REFUSES = ["", "   ", "-", "n/a", "00", "12345", "+++"];

  it.each(ACCEPTES)("accepte %s", (p) => expect(isCallablePhone(p)).toBe(true));
  it.each(REFUSES)("refuse %s", (p) => expect(isCallablePhone(p)).toBe(false));

  it("rend exactement le même verdict que validateCarLead", () => {
    for (const phone of [...ACCEPTES, ...REFUSES]) {
      const parLaRoute = validateCarLead({ ...LEAD_VALIDE, phone }).kind === "ok";
      expect(isCallablePhone(phone), `divergence sur "${phone}"`).toBe(parLaRoute);
    }
  });

  it("traite null et undefined comme un téléphone absent", () => {
    expect(isCallablePhone(null)).toBe(false);
    expect(isCallablePhone(undefined)).toBe(false);
  });
});
