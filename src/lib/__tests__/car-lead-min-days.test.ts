import { describe, it, expect } from "vitest";
import { validateCarLead } from "@/lib/car-lead";
import { SHORT_STAY_MIN_DAYS } from "@/lib/car-pricing";

// Pourquoi ces tests existent : sur 60 jours, AUCUNE demande sous 3 jours n'a
// recu la moindre offre (0 j -> 2 demandes 0 offre, 1 j -> 2 demandes 0 offre),
// contre 26 demandes sur 26 servies a partir de 3 jours. Les invitations
// partaient bien et etaient relancees : 4 loueurs sur 8 ont explicitement
// decline. Le voyageur remplissait, recevait un accuse, et attendait une offre
// qui ne venait jamais.
// La garde vit dans le validateur et PAS seulement dans le formulaire : celui-ci
// est du code client, desactiver un bouton n'empeche aucun POST direct, et la
// route declenche un fan-out d'emails vers de vrais loueurs.

const LEAD_VALIDE = {
  pickup: "heraklion",
  carType: "city",
  name: "Firmino Facchin",
  email: "client@example.com",
  dateFrom: "2026-09-08",
  dateTo: "2026-09-16",
  timeFrom: "10:00",
  timeTo: "19:00",
};

describe("validateCarLead : durée minimale de location", () => {
  it("refuse une location d'un seul jour", () => {
    // Cas reel : la demande 53, Rethymno 15/08 -> 16/08.
    const r = validateCarLead({ ...LEAD_VALIDE, dateFrom: "2026-08-15", dateTo: "2026-08-16" });
    expect(r.kind).toBe("error");
    if (r.kind === "error") {
      expect(r.status).toBe(422);
      expect(r.error).toBe("Rental too short");
    }
  });

  it("refuse une location qui commence et finit le même jour", () => {
    const r = validateCarLead({ ...LEAD_VALIDE, dateFrom: "2026-08-15", dateTo: "2026-08-15", timeFrom: "09:00", timeTo: "18:00" });
    expect(r.kind).toBe("error");
  });

  it("accepte une location exactement au seuil", () => {
    // 15 -> 18 avec restitution avant l'heure de prise : 3 jours pleins, pas 4.
    const r = validateCarLead({ ...LEAD_VALIDE, dateFrom: "2026-08-15", dateTo: "2026-08-18", timeFrom: "10:00", timeTo: "09:00" });
    expect(r.kind).toBe("ok");
  });

  it("accepte une location longue", () => {
    expect(validateCarLead({ ...LEAD_VALIDE }).kind).toBe("ok");
  });

  it("refuse toujours des dates invalides avant de juger la durée", () => {
    // L'ordre compte : une date inversee doit rendre « Invalid dates », pas
    // « Rental too short », sinon le message envoie le visiteur corriger la
    // mauvaise chose.
    const r = validateCarLead({ ...LEAD_VALIDE, dateFrom: "2026-08-18", dateTo: "2026-08-15" });
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.error).toBe("Invalid dates");
  });

  it("le seuil du validateur est celui du formulaire", () => {
    // Une constante dupliquee derive : le wizard et la route doivent lire la
    // meme valeur, sinon le bouton reste actif sur une demande que la route
    // refusera.
    expect(SHORT_STAY_MIN_DAYS).toBe(3);
  });
});
