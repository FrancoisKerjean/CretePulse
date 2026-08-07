import { describe, it, expect } from "vitest";
import { validateCarLead, isCallablePhone } from "@/lib/car-lead";

// Pourquoi ces tests existent : Zakros Tours a signale le 07/08/2026 qu'il ne
// pouvait pas joindre le client de la demande 33 (« If we had mobile numbers it
// would be helpful »), apres 9 jours de silence.
// La reponse N'EST PAS d'exiger le telephone des la demande : le loueur en
// appel d'offres recoit une demande AVEUGLE, le numero ne lui sert qu'APRES
// acceptation. L'exiger a l'entree ferait payer 38 % des demandes (taux de
// remplissage mesure sur 3 mois : 1/2, 13/21, 5/8) pour une donnee qui dort.
// Il est exige a l'acceptation : voir accept-phone.test.ts.

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

describe("validateCarLead : le téléphone reste facultatif à la demande", () => {
  it("garde le téléphone quand il est fourni", () => {
    const r = validateCarLead({ ...LEAD_VALIDE });
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.row.customer_phone).toBe("+39 333 1234567");
  });

  it("accepte une demande sans téléphone et la stocke à null", () => {
    // Regression : exiger le numero ici couperait le tunnel a l'etape 4 sur 4
    // pour une donnee que le loueur ne verra pas avant l'acceptation.
    const { phone: _omis, ...sansPhone } = LEAD_VALIDE;
    const r = validateCarLead(sansPhone);
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.row.customer_phone).toBeNull();
  });

  it("normalise un téléphone vide en null plutôt qu'en chaîne vide", () => {
    const r = validateCarLead({ ...LEAD_VALIDE, phone: "   " });
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.row.customer_phone).toBeNull();
  });
});

describe("isCallablePhone : une seule règle, partagée par tous les points d'entrée", () => {
  const ACCEPTES = ["+39 333 1234567", "6978186250", "+30 28970 22137", "0612345678"];
  const REFUSES = ["", "   ", "-", "n/a", "00", "12345", "+++"];

  it.each(ACCEPTES)("accepte %s", (p) => expect(isCallablePhone(p)).toBe(true));
  it.each(REFUSES)("refuse %s", (p) => expect(isCallablePhone(p)).toBe(false));

  it("traite null et undefined comme un téléphone absent", () => {
    expect(isCallablePhone(null)).toBe(false);
    expect(isCallablePhone(undefined)).toBe(false);
  });
});
