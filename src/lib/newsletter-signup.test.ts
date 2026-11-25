import { describe, it, expect } from "vitest";
import { signupDecision, DAILY_CONFIRMATION_CAP } from "./newsletter-signup";

const NOW = Date.parse("2026-11-24T18:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

describe("signupDecision", () => {
  it("nouvelle adresse sous le plafond : envoi", () => {
    expect(signupDecision({ existing: null, sentLast24h: 0, now: NOW })).toBe("send");
  });

  it("abonné actif : rien", () => {
    const existing = { confirmed: true, unsubscribed_at: null, subscribed_at: daysAgo(40) };
    expect(signupDecision({ existing, sentLast24h: 0, now: NOW })).toBe("already_subscribed");
  });

  it("confirmation envoyée il y a 1 h : pas de second mail (le robot ne peut plus marteler une victime)", () => {
    const existing = { confirmed: false, unsubscribed_at: null, subscribed_at: new Date(NOW - 3_600_000).toISOString() };
    expect(signupDecision({ existing, sentLast24h: 0, now: NOW })).toBe("recently_sent");
  });

  it("confirmation envoyée il y a 6 jours : toujours pas", () => {
    const existing = { confirmed: false, unsubscribed_at: null, subscribed_at: daysAgo(6) };
    expect(signupDecision({ existing, sentLast24h: 0, now: NOW })).toBe("recently_sent");
  });

  it("confirmation restée sans suite depuis 8 jours : nouvel envoi permis", () => {
    const existing = { confirmed: false, unsubscribed_at: null, subscribed_at: daysAgo(8) };
    expect(signupDecision({ existing, sentLast24h: 0, now: NOW })).toBe("send");
  });

  it("désabonné qui revient : nouvel envoi, même récent", () => {
    const existing = { confirmed: true, unsubscribed_at: daysAgo(1), subscribed_at: daysAgo(2) };
    expect(signupDecision({ existing, sentLast24h: 0, now: NOW })).toBe("send");
  });

  it("date d'inscription absente : envoi (pas de blocage à vie)", () => {
    const existing = { confirmed: false, unsubscribed_at: null, subscribed_at: null };
    expect(signupDecision({ existing, sentLast24h: 0, now: NOW })).toBe("send");
  });

  it("plafond global atteint : rien ne part", () => {
    expect(signupDecision({ existing: null, sentLast24h: DAILY_CONFIRMATION_CAP, now: NOW })).toBe("daily_cap");
    expect(signupDecision({ existing: null, sentLast24h: DAILY_CONFIRMATION_CAP - 1, now: NOW })).toBe("send");
  });

  it("abonné actif sous plafond atteint : reste « déjà abonné »", () => {
    const existing = { confirmed: true, unsubscribed_at: null, subscribed_at: daysAgo(40) };
    expect(signupDecision({ existing, sentLast24h: 99, now: NOW })).toBe("already_subscribed");
  });
});
