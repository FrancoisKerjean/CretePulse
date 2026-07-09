// node --experimental-strip-types scripts/check-activity-quotes.mjs
import { sortQuotesByPrice, canPartnerQuote, findChosenInvite, partnerNeedsRelance, clientNeedsRelance } from "../src/lib/activity-quotes.ts";
import { isActivityInclusionKey } from "../src/lib/activity-inclusions.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

const q = (id, price, status = "quoted") => ({ id, partner_id: id, partner_name: `P${id}`, status, quote_price: price, quote_details: `Activity details ${id}`, quoted_at: "2026-07-08T10:00:00Z" });

ok("tri par prix croissant", (() => { const s = sortQuotesByPrice([q(1, 300), q(2, 200), q(3, 250)]); return s.map(x => x.id).join() === "2,3,1"; })());
ok("exclut les non-chiffres du tri", (() => { const s = sortQuotesByPrice([q(1, 300), q(2, null, "invited"), q(3, 200, "declined")]); return s.length === 1 && s[0].id === 1; })());

ok("peut chiffrer sur demande sent", canPartnerQuote("sent") === true);
ok("peut chiffrer sur demande quoted", canPartnerQuote("quoted") === true);
ok("ne peut pas chiffrer sur accepted", canPartnerQuote("accepted") === false);
ok("ne peut pas chiffrer sur declined_by_client", canPartnerQuote("declined_by_client") === false);

ok("choix valide", findChosenInvite([q(1, 300), q(2, 200)], 2)?.id === 2);
ok("choix d'une invite sans devis -> null", findChosenInvite([q(1, null, "invited")], 1) === null);
ok("choix d'une invite inexistante -> null", findChosenInvite([q(1, 300)], 99) === null);

const H = 3600000;
ok("relance loueur due", partnerNeedsRelance({ status: "invited", relanced_at: null }, "quoted", 1751961600000, 1751961600000 - 25 * H));
ok("pas de relance si deja relance", !partnerNeedsRelance({ status: "invited", relanced_at: "x" }, "quoted", 1751961600000, 1751961600000 - 25 * H));
ok("pas de relance si <24h", !partnerNeedsRelance({ status: "invited", relanced_at: null }, "quoted", 1751961600000, 1751961600000 - 5 * H));
ok("pas de relance si deja chiffre", !partnerNeedsRelance({ status: "quoted", relanced_at: null }, "quoted", 1751961600000, 1751961600000 - 25 * H));
ok("pas de relance si demande fermee", !partnerNeedsRelance({ status: "invited", relanced_at: null }, "accepted", 1751961600000, 1751961600000 - 25 * H));

ok("relance client due (jamais relance)", clientNeedsRelance({ status: "quoted", client_relanced_at: null, client_relance_count: 0 }, 1751961600000));
ok("pas de relance client si count>=2", !clientNeedsRelance({ status: "quoted", client_relanced_at: null, client_relance_count: 2 }, 1751961600000));
ok("pas de relance client si <24h depuis derniere", !clientNeedsRelance({ status: "quoted", client_relanced_at: new Date(1751961600000 - 5 * H).toISOString(), client_relance_count: 1 }, 1751961600000));
ok("pas de relance client si pas d'offre", !clientNeedsRelance({ status: "sent", client_relanced_at: null, client_relance_count: 0 }, 1751961600000));

ok("isActivityInclusionKey meals -> true", isActivityInclusionKey("meals") === true);
ok("isActivityInclusionKey unlimited_km -> false", isActivityInclusionKey("unlimited_km") === false);

console.log(fail ? `\n${fail} FAIL` : "\nAll passed");
process.exit(fail ? 1 : 0);
