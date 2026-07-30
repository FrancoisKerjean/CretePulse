import { describe, it, expect } from "vitest";
import {
  staysKpis,
  listingSignal,
  ownerIsBlocking,
  type AdminStayRequest,
  type AdminStayListing,
} from "./admin-metrics";

const NOW = new Date("2026-07-30T12:00:00Z").getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const req = (o: Partial<AdminStayRequest>): AdminStayRequest => ({
  id: 1,
  listing_id: 1,
  status: "pending",
  created_at: daysAgo(1),
  quoted_price_eur: null,
  deposit_amount: null,
  deposit_paid_at: null,
  balance_amount: null,
  balance_paid_at: null,
  commission_eur: null,
  ...o,
});

const listing = (o: Partial<AdminStayListing>): AdminStayListing => ({
  id: 1,
  slug: "villa",
  owner_id: 1,
  title: "Villa",
  status: "published",
  base_price_eur: 100,
  min_nights: 2,
  photos: [],
  ical_private_url: "https://airbnb.com/x.ics",
  ical_synced_at: daysAgo(0),
  ical_last_error: null,
  ...o,
});

describe("staysKpis, fenetre de mesure", () => {
  it("ne compte que les demandes de la fenetre", () => {
    const k = staysKpis(
      [req({ id: 1, created_at: daysAgo(2) }), req({ id: 2, created_at: daysAgo(9) })],
      7,
      NOW,
    );
    expect(k.requests).toBe(1);
  });
});

describe("staysKpis, taux d acceptation", () => {
  // Une demande en attente n'est pas un refus : elle n'entre pas au denominateur,
  // sinon le taux baisse mecaniquement a chaque nouvelle demande.
  it("ignore les demandes encore en attente", () => {
    const k = staysKpis(
      [
        req({ id: 1, status: "approved" }),
        req({ id: 2, status: "declined" }),
        req({ id: 3, status: "pending" }),
      ],
      7,
      NOW,
    );
    expect(k.acceptRate).toBeCloseTo(0.5);
  });

  it("compte une demande payee comme acceptee", () => {
    const k = staysKpis(
      [req({ id: 1, status: "deposit_paid" }), req({ id: 2, status: "confirmed" })],
      7,
      NOW,
    );
    expect(k.acceptRate).toBe(1);
  });

  it("compte une expiration comme un non, le proprietaire n a pas repondu", () => {
    const k = staysKpis(
      [req({ id: 1, status: "approved" }), req({ id: 2, status: "expired" })],
      7,
      NOW,
    );
    expect(k.acceptRate).toBeCloseTo(0.5);
  });

  it("rend null quand rien n a encore ete tranche, jamais zero", () => {
    // Un taux de 0 % se lit comme un echec commercial. L'absence de mesure doit
    // se voir comme telle : n/d.
    expect(staysKpis([req({ status: "pending" })], 7, NOW).acceptRate).toBeNull();
    expect(staysKpis([], 7, NOW).acceptRate).toBeNull();
  });
});

describe("staysKpis, taux de paiement de l acompte", () => {
  it("mesure les acomptes payes parmi les demandes acceptees", () => {
    const k = staysKpis(
      [
        req({ id: 1, status: "deposit_paid", deposit_paid_at: daysAgo(1) }),
        req({ id: 2, status: "approved" }),
      ],
      7,
      NOW,
    );
    expect(k.depositRate).toBeCloseTo(0.5);
  });

  it("rend null sans aucune acceptation", () => {
    expect(staysKpis([req({ status: "declined" })], 7, NOW).depositRate).toBeNull();
  });
});

describe("staysKpis, commission encaissee", () => {
  // Deux prelevements Stripe distincts : 30 % de la commission sur l'acompte, le
  // reste sur le solde. Compter la commission entiere des l'acompte gonflerait
  // l'encaisse d'un facteur trois.
  it("ne compte que la part acompte quand le solde n est pas paye", () => {
    const k = staysKpis(
      [req({ status: "deposit_paid", deposit_paid_at: daysAgo(1), commission_eur: 35 })],
      7,
      NOW,
    );
    expect(k.commissionCollectedEur).toBeCloseTo(10.5);
  });

  it("compte la commission entiere quand le solde est paye", () => {
    const k = staysKpis(
      [
        req({
          status: "confirmed",
          deposit_paid_at: daysAgo(3),
          balance_paid_at: daysAgo(1),
          commission_eur: 35,
        }),
      ],
      7,
      NOW,
    );
    expect(k.commissionCollectedEur).toBe(35);
  });

  it("ne compte rien sur une demande jamais payee", () => {
    const k = staysKpis([req({ status: "approved", commission_eur: 35 })], 7, NOW);
    expect(k.commissionCollectedEur).toBe(0);
  });

  // La commission encaissee est un montant de tresorerie : elle porte sur tout
  // l'historique, pas sur la fenetre de mesure. Un paiement du mois dernier ne
  // sort pas de la caisse parce que la demande a plus de 7 jours.
  it("porte sur tout l historique, pas sur la fenetre", () => {
    const k = staysKpis(
      [
        req({
          created_at: daysAgo(40),
          status: "confirmed",
          deposit_paid_at: daysAgo(38),
          balance_paid_at: daysAgo(30),
          commission_eur: 35,
        }),
      ],
      7,
      NOW,
    );
    expect(k.requests).toBe(0);
    expect(k.commissionCollectedEur).toBe(35);
  });
});

describe("listingSignal", () => {
  it("dit ok quand le flux est frais", () => {
    expect(listingSignal(listing({}), NOW)).toBe("ok");
  });

  // C'est LE signal de surbooking : une annonce reservable dont le calendrier
  // Airbnb n'est pas branche vendra deux fois les memes nuits.
  it("alerte sur une annonce publiee sans flux ical", () => {
    expect(listingSignal(listing({ ical_private_url: null }), NOW)).toBe("no_ical");
  });

  it("alerte quand la derniere synchro depasse 24 heures", () => {
    expect(listingSignal(listing({ ical_synced_at: daysAgo(2) }), NOW)).toBe("stale_ical");
    expect(listingSignal(listing({ ical_synced_at: null }), NOW)).toBe("stale_ical");
  });

  it("remonte l erreur du flux avant tout le reste", () => {
    expect(
      listingSignal(listing({ ical_last_error: "HTTP 403", ical_synced_at: daysAgo(0) }), NOW),
    ).toBe("ical_error");
  });

  it("ne reproche rien a une annonce depubliee", () => {
    expect(listingSignal(listing({ status: "unpublished", ical_private_url: null }), NOW)).toBe(
      "unpublished",
    );
    expect(listingSignal(listing({ status: "draft", ical_private_url: null }), NOW)).toBe(
      "unpublished",
    );
  });
});

describe("ownerIsBlocking", () => {
  // Une annonce visible dont le proprietaire n'a pas fini son KYC accepte des
  // demandes qu'elle ne pourra pas encaisser : c'est un cul-de-sac cote voyageur.
  it("signale un proprietaire sans KYC complet qui a une annonce publiee", () => {
    expect(ownerIsBlocking("pending", [listing({ status: "published" })])).toBe(true);
    expect(ownerIsBlocking(null, [listing({ status: "published" })])).toBe(true);
  });

  it("ne signale rien quand le KYC est complet", () => {
    expect(ownerIsBlocking("complete", [listing({ status: "published" })])).toBe(false);
  });

  it("ne signale rien sans annonce publiee", () => {
    expect(ownerIsBlocking("none", [listing({ status: "draft" })])).toBe(false);
    expect(ownerIsBlocking("none", [])).toBe(false);
  });
});
