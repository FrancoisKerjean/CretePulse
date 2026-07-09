// node --experimental-strip-types scripts/check-car-quotes.mjs
import { sortQuotesByPrice, canPartnerQuote, canCancelRequest, findChosenInvite, partnerNeedsRelance, clientNeedsRelance,
  normalizeQuoteOption, normalizeQuoteOptions, bestOption, sortOptionsByPrice, findChosenOption } from "../src/lib/car-quotes.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

const q = (id, price, status = "quoted") => ({ id, partner_id: id, partner_name: `P${id}`, status, quote_price: price, quoted_at: "2026-07-08T10:00:00Z" });

ok("tri par prix croissant", (() => { const s = sortQuotesByPrice([q(1, 300), q(2, 200), q(3, 250)]); return s.map(x => x.id).join() === "2,3,1"; })());
ok("exclut les non-chiffres du tri", (() => { const s = sortQuotesByPrice([q(1, 300), q(2, null, "invited"), q(3, 200, "declined")]); return s.length === 1 && s[0].id === 1; })());

ok("peut chiffrer sur demande sent", canPartnerQuote("sent") === true);
ok("peut chiffrer sur demande quoted", canPartnerQuote("quoted") === true);
ok("ne peut pas chiffrer sur accepted", canPartnerQuote("accepted") === false);
ok("ne peut pas chiffrer sur declined_by_client", canPartnerQuote("declined_by_client") === false);

ok("annulable si sent/quoted/email_failed", canCancelRequest("sent") && canCancelRequest("quoted") && canCancelRequest("email_failed"));
ok("non annulable si terminal", !canCancelRequest("accepted") && !canCancelRequest("declined_by_client") && !canCancelRequest("cancelled"));

ok("choix valide", findChosenInvite([q(1, 300), q(2, 200)], 2)?.id === 2);
ok("choix d'une invite sans devis -> null", findChosenInvite([q(1, null, "invited")], 1) === null);
ok("choix d'une invite inexistante -> null", findChosenInvite([q(1, 300)], 99) === null);

const H = 3600000;
ok("relance loueur due", partnerNeedsRelance({ status: "invited", relanced_at: null }, "quoted", 1751961600000, 1751961600000 - 25 * H));
ok("pas de relance si deja relance", !partnerNeedsRelance({ status: "invited", relanced_at: "x" }, "quoted", 1751961600000, 1751961600000 - 25 * H));
ok("pas de relance si <24h", !partnerNeedsRelance({ status: "invited", relanced_at: null }, "quoted", 1751961600000, 1751961600000 - 5 * H));
ok("pas de relance si deja chiffre", !partnerNeedsRelance({ status: "quoted", relanced_at: null }, "quoted", 1751961600000, 1751961600000 - 25 * H));
ok("pas de relance si demande fermee", !partnerNeedsRelance({ status: "invited", relanced_at: null }, "accepted", 1751961600000, 1751961600000 - 25 * H));
ok("demande annulee = hors relance loueur", !partnerNeedsRelance({ status: "invited", relanced_at: null }, "cancelled", 1751961600000, 1751961600000 - 25 * H));
ok("demande annulee = hors relance client", !clientNeedsRelance({ status: "cancelled", client_relanced_at: null, client_relance_count: 0 }, 1751961600000));

ok("relance client due (jamais relance)", clientNeedsRelance({ status: "quoted", client_relanced_at: null, client_relance_count: 0 }, 1751961600000));
ok("pas de relance client si count>=2", !clientNeedsRelance({ status: "quoted", client_relanced_at: null, client_relance_count: 2 }, 1751961600000));
ok("pas de relance client si <24h depuis derniere", !clientNeedsRelance({ status: "quoted", client_relanced_at: new Date(1751961600000 - 5 * H).toISOString(), client_relance_count: 1 }, 1751961600000));
ok("pas de relance client si pas d'offre", !clientNeedsRelance({ status: "sent", client_relanced_at: null, client_relance_count: 0 }, 1751961600000));

// ── Multi-offres (retour Lux Trans « only one option to send ») ──────────────
ok("normalise une option valide", (() => { const o = normalizeQuoteOption({ price: 30, carModel: " VW Polo ", gearbox: "manual", inclusions: ["gps", "unlimited_km"] }); return o && o.price === 30 && o.car_model === "VW Polo" && o.gearbox === "manual" && o.inclusions.join() === "unlimited_km"; })());
ok("prix invalide -> null", normalizeQuoteOption({ price: 0 }) === null && normalizeQuoteOption({ price: 200000 }) === null && normalizeQuoteOption({ price: "abc" }) === null);
ok("gearbox inconnu -> null (peu importe)", normalizeQuoteOption({ price: 30, gearbox: "cvt" }).gearbox === null);
ok("inclusions inconnues filtrées", normalizeQuoteOption({ price: 30, inclusions: ["unlimited_km", "teleport"] }).inclusions.join() === "unlimited_km");
ok("normalizeQuoteOptions ignore les invalides", normalizeQuoteOptions([{ price: 30 }, { price: 0 }, { price: 40 }]).length === 2);
ok("normalizeQuoteOptions cap à 6", normalizeQuoteOptions(Array.from({ length: 9 }, (_, i) => ({ price: i + 1 }))).length === 6);
ok("normalizeQuoteOptions non-array -> []", normalizeQuoteOptions("x").length === 0);
ok("bestOption = la moins chère", bestOption([{ price: 40 }, { price: 30 }, { price: 35 }]).price === 30);
ok("bestOption liste vide -> null", bestOption([]) === null);

const opt = (id, invite_id, price) => ({ id, invite_id, partner_id: invite_id, partner_name: `P${invite_id}`, price, currency: "EUR", car_model: null, gearbox: null, inclusions: [], created_at: "2026-07-08T10:00:00Z" });
ok("sortOptionsByPrice croissant toutes invites confondues", sortOptionsByPrice([opt(1, 10, 40), opt(2, 10, 30), opt(3, 20, 35)]).map((o) => o.id).join() === "2,3,1");
ok("findChosenOption existante", findChosenOption([opt(1, 10, 40), opt(2, 20, 30)], 2)?.id === 2);
ok("findChosenOption inexistante -> null", findChosenOption([opt(1, 10, 40)], 99) === null);

console.log(fail ? `\n${fail} FAIL` : "\nAll passed");
process.exit(fail ? 1 : 0);
