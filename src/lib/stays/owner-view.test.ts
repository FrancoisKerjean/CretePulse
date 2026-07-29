import { describe, it, expect } from "vitest";
import { ownerEarnings, upcomingArrivals, calendarNights } from "./owner-view";

const LISTING = { id: 9, title: "Villa Danae", cleaning_fee_eur: 40, commission_rate: 5 };

const REQ = {
  id: 1, listing_id: 9, guest_name: "Natasha", guest_phone: "+33600000000",
  guest_email: "n@x.com", date_from: "2026-09-25", date_to: "2026-09-30",
  status: "confirmed", quoted_price_eur: 100,
};

describe("ownerEarnings", () => {
  it("detaille chaque reservation payee : brut, commission, net", () => {
    const e = ownerEarnings([REQ], [LISTING]);
    // 100 EUR x 5 nuits + 40 de menage = 540 net proprietaire, commission 27,
    // le voyageur paie 567.
    expect(e.lines).toHaveLength(1);
    expect(e.lines[0]).toMatchObject({
      requestId: 1,
      guestTotalEur: 567,
      commissionEur: 27,
      ownerNetEur: 540,
      status: "confirmed",
    });
  });

  it("separe ce qui est acquis de ce qui est attendu", () => {
    const e = ownerEarnings(
      [REQ, { ...REQ, id: 2, status: "deposit_paid" }, { ...REQ, id: 3, status: "pending" }],
      [LISTING],
    );
    // Confirme = encaisse en entier. Acompte paye = partiellement encaisse.
    // En attente = rien, et ne doit pas gonfler le total.
    expect(e.receivedEur).toBe(540);
    expect(e.expectedEur).toBe(540);
    expect(e.lines).toHaveLength(2);
  });

  it("ignore une demande refusee ou annulee", () => {
    const e = ownerEarnings([{ ...REQ, status: "declined" }], [LISTING]);
    expect(e.lines).toHaveLength(0);
    expect(e.receivedEur).toBe(0);
  });

  it("ne plante pas sur une annonce disparue", () => {
    const e = ownerEarnings([REQ], []);
    expect(e.lines).toHaveLength(0);
  });
});

describe("upcomingArrivals", () => {
  const today = "2026-09-20";

  it("ne garde que les sejours payes encore a venir, les plus proches d abord", () => {
    const a = upcomingArrivals(
      [
        { ...REQ, id: 1, date_from: "2026-10-10" },
        { ...REQ, id: 2, date_from: "2026-09-25" },
        { ...REQ, id: 3, date_from: "2026-09-01" },
        { ...REQ, id: 4, date_from: "2026-09-28", status: "pending" },
      ],
      today,
    );
    expect(a.map((r) => r.id)).toEqual([2, 1]);
  });

  it("garde un sejour commence aujourd hui : le voyageur arrive", () => {
    expect(upcomingArrivals([{ ...REQ, date_from: today }], today)).toHaveLength(1);
  });
});

describe("calendarNights", () => {
  it("dit d ou vient chaque nuit prise", () => {
    const c = calendarNights([
      { date: "2026-08-10", status: "booked" },
      { date: "2026-08-11", status: "blocked_ota" },
      { date: "2026-08-12", status: "hold" },
    ]);
    expect(c).toEqual([
      { date: "2026-08-10", origin: "sold", releasable: false },
      { date: "2026-08-11", origin: "ota", releasable: false },
      { date: "2026-08-12", origin: "owner", releasable: true },
    ]);
  });

  it("trie par date, pour un calendrier lisible", () => {
    const c = calendarNights([
      { date: "2026-09-01", status: "hold" },
      { date: "2026-08-10", status: "hold" },
    ]);
    expect(c.map((n) => n.date)).toEqual(["2026-08-10", "2026-09-01"]);
  });
});
