import { describe, it, expect } from "vitest";
import {
  normalizeBusinessName,
  domainOf,
  matchPlace,
  formatRating,
  ratingIsPlausible,
  isStaleRating,
  searchQueryFor,
  type PlaceCandidate,
} from "./google-rating";

const place = (over: Partial<PlaceCandidate> & { id: string }): PlaceCandidate => ({
  displayName: "X",
  rating: 4.5,
  userRatingCount: 100,
  ...over,
});

describe("normalizeBusinessName", () => {
  it("ignore casse, accents et ponctuation", () => {
    expect(normalizeBusinessName("Zorbas Rent a Car")).toBe(normalizeBusinessName("ZORBAS  rent-a-car"));
  });

  it("retire les mots du metier qui ne distinguent personne", () => {
    expect(normalizeBusinessName("Beepit Rental Cars")).toBe("beepit");
    expect(normalizeBusinessName("Zorbas Rent a Car Crete")).toBe("zorbas");
  });

  it("garde 'auto' quand il fait partie du nom propre", () => {
    // "Auto Smart" et "Autochoice" sont deux loueurs distincts du roster :
    // raboter "auto" les rendrait confondables.
    expect(normalizeBusinessName("Auto Smart Car Rental")).toBe("auto smart");
    expect(normalizeBusinessName("Autochoice Rent a Car")).toBe("autochoice");
  });
});

describe("domainOf", () => {
  it("lit le domaine d une adresse email et d une URL", () => {
    expect(domainOf("reservations@beepit.gr")).toBe("beepit.gr");
    expect(domainOf("https://www.zorbasrentacar.gr/fleet")).toBe("zorbasrentacar.gr");
  });

  it("rend null sur les boites generiques : elles n identifient aucune entreprise", () => {
    expect(domainOf("sales.iqcarrentals@gmail.com")).toBe(null);
    expect(domainOf("autosmartrental@yahoo.gr")).toBe(null);
  });

  it("rend null sur une entree vide ou malformee", () => {
    expect(domainOf(null)).toBe(null);
    expect(domainOf("pas une adresse")).toBe(null);
  });
});

describe("matchPlace", () => {
  const partner = { name: "Beepit Rental Cars", email: "reservations@beepit.gr" };

  it("retient le lieu dont le site porte le meme domaine que le loueur", () => {
    const res = matchPlace(partner, [
      place({ id: "wrong", displayName: "Hertz Heraklion", websiteUri: "https://hertz.gr" }),
      place({ id: "good", displayName: "BEEPIT", websiteUri: "https://www.beepit.gr/en" }),
    ]);
    expect(res?.place.id).toBe("good");
    expect(res?.reason).toBe("domain");
  });

  it("retient le lieu par le nom quand il est le seul a correspondre", () => {
    const res = matchPlace(partner, [
      place({ id: "a", displayName: "Beepit Rental Cars Heraklion Airport" }),
      place({ id: "b", displayName: "Green Motion Car Rental" }),
    ]);
    expect(res?.place.id).toBe("a");
    expect(res?.reason).toBe("name");
  });

  it("refuse de trancher quand deux lieux portent le meme nom", () => {
    // Deux agences du meme loueur : on ne sait pas laquelle est le siege,
    // et coller la note de la mauvaise fausserait l affichage.
    const res = matchPlace(partner, [
      place({ id: "a", displayName: "Beepit Rental Cars Heraklion" }),
      place({ id: "b", displayName: "Beepit Rental Cars Chania" }),
    ]);
    expect(res).toBe(null);
  });

  it("ne colle JAMAIS la note d un concurrent quand rien ne correspond", () => {
    const res = matchPlace(partner, [
      place({ id: "x", displayName: "Hertz Heraklion Airport", rating: 4.9 }),
      place({ id: "y", displayName: "Avis Crete", rating: 4.8 }),
    ]);
    expect(res).toBe(null);
  });

  it("ecarte un lieu sans note : il n y a rien a afficher", () => {
    const res = matchPlace(partner, [
      place({ id: "a", displayName: "Beepit Rental Cars", rating: null, userRatingCount: null }),
    ]);
    expect(res).toBe(null);
  });

  it("le domaine prime sur le nom", () => {
    const res = matchPlace(partner, [
      place({ id: "byname", displayName: "Beepit Rental Cars Heraklion" }),
      place({ id: "bydomain", displayName: "Leonessa Group", websiteUri: "https://beepit.gr" }),
    ]);
    expect(res?.place.id).toBe("bydomain");
  });

  it("rend null sur une liste vide", () => {
    expect(matchPlace(partner, [])).toBe(null);
  });
});

describe("ratingIsPlausible", () => {
  it("accepte une note dans l echelle Google avec au moins un avis", () => {
    expect(ratingIsPlausible(4.6, 312)).toBe(true);
  });

  it("refuse hors echelle, sans avis, ou non numerique", () => {
    expect(ratingIsPlausible(5.4, 10)).toBe(false);
    expect(ratingIsPlausible(-1, 10)).toBe(false);
    expect(ratingIsPlausible(4.6, 0)).toBe(false);
    expect(ratingIsPlausible(null, 12)).toBe(false);
    expect(ratingIsPlausible(Number.NaN, 12)).toBe(false);
  });
});

describe("formatRating", () => {
  it("affiche la note a une decimale, virgule francaise, avec le nombre d avis", () => {
    expect(formatRating(4.6, 312)).toBe("4,6 (312 avis)");
    expect(formatRating(5, 1)).toBe("5,0 (1 avis)");
  });

  it("rend null quand la note est absente ou implausible", () => {
    expect(formatRating(null, null)).toBe(null);
    expect(formatRating(4.6, 0)).toBe(null);
  });
});

describe("isStaleRating", () => {
  const now = new Date("2026-07-30T10:00:00Z");

  it("considere une note jamais relevee comme a rafraichir", () => {
    expect(isStaleRating(null, now)).toBe(true);
  });

  it("laisse tranquille une note relevee dans la fenetre", () => {
    expect(isStaleRating("2026-07-28T10:00:00Z", now)).toBe(false);
  });

  it("redemande une note plus vieille que la fenetre", () => {
    expect(isStaleRating("2026-07-01T10:00:00Z", now)).toBe(true);
  });

  it("traite une date illisible comme a rafraichir plutot que de jeter", () => {
    expect(isStaleRating("pas une date", now)).toBe(true);
  });
});

describe("searchQueryFor", () => {
  it("ajoute le metier et l ile, sans quoi Google rend des homonymes hors Crete", () => {
    expect(searchQueryFor({ name: "Auto Smart", email: "autosmartrental@gmail.com" }))
      .toBe("Auto Smart car rental Crete Greece");
  });

  it("ne repete pas un mot deja porte par le nom, pluriel compris", () => {
    expect(searchQueryFor({ name: "Beepit Rental Cars", email: "reservations@beepit.gr" }))
      .toBe("Beepit Rental Cars Crete Greece");
    expect(searchQueryFor({ name: "Zorbas Rent a Car Crete", email: "info@zorbasrentacar.gr" }))
      .toBe("Zorbas Rent a Car Crete Greece");
  });
});
