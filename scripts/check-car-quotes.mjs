// node --experimental-strip-types scripts/check-car-quotes.mjs
import { sortQuotesByPrice, canPartnerQuote, canCancelRequest, findChosenInvite, partnerNeedsRelance, isPartnerNudgeHour, quotedModelLabel, clientNeedsRelance,
  clientAutoCloseReason,
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
// Seuil ramene de 24 h a 2 h le 01/08/2026. Mesure : la 1re offre arrive en
// <=0,5 h sur toutes les issues ou le client reste, 6,7 h sur les 8 demandes ou
// il disparait sans jamais trancher. Une relance a H+24 arrivait apres la
// bataille. Le plafond d'UNE relance par invite ne bouge pas.
ok("relance loueur due des 3h", partnerNeedsRelance({ status: "invited", relanced_at: null }, "quoted", 1751961600000, 1751961600000 - 3 * H));
ok("pas de relance si <2h", !partnerNeedsRelance({ status: "invited", relanced_at: null }, "quoted", 1751961600000, 1751961600000 - 1 * H));

// Fenetre d'envoi : un loueur grec ne se releve pas a 3 h du matin. La fenetre
// porte sur l'heure d'ENVOI, jamais sur le calcul du delai, sinon une demande
// de nuit perdrait son anciennete.
const at = (iso) => new Date(iso).getTime();
ok("fenetre ouverte a 10h Athenes", isPartnerNudgeHour(at("2026-08-01T07:00:00Z")));
ok("fenetre fermee a 3h Athenes", !isPartnerNudgeHour(at("2026-08-01T00:00:00Z")));
ok("fenetre fermee a 22h Athenes", !isPartnerNudgeHour(at("2026-08-01T19:00:00Z")));
ok("fenetre ouverte des 8h Athenes (borne incluse)", isPartnerNudgeHour(at("2026-08-01T05:00:00Z")));
ok("fenetre fermee a 21h Athenes (borne exclue)", !isPartnerNudgeHour(at("2026-08-01T18:00:00Z")));
// Heure d'hiver : Athenes passe a UTC+2, la fenetre doit suivre le fuseau reel.
ok("fenetre suit l'heure d'hiver", isPartnerNudgeHour(at("2026-01-15T07:00:00Z")) && !isPartnerNudgeHour(at("2026-01-15T05:00:00Z")));
ok("pas de relance si deja chiffre", !partnerNeedsRelance({ status: "quoted", relanced_at: null }, "quoted", 1751961600000, 1751961600000 - 25 * H));
ok("pas de relance si demande fermee", !partnerNeedsRelance({ status: "invited", relanced_at: null }, "accepted", 1751961600000, 1751961600000 - 25 * H));
ok("demande annulee = hors relance loueur", !partnerNeedsRelance({ status: "invited", relanced_at: null }, "cancelled", 1751961600000, 1751961600000 - 25 * H));
ok("demande annulee = hors relance client", !clientNeedsRelance({ status: "cancelled", client_relanced_at: null, client_relance_count: 0 }, 1751961600000));

ok("relance client due (jamais relance)", clientNeedsRelance({ status: "quoted", client_relanced_at: null, client_relance_count: 0 }, 1751961600000));
ok("pas de relance client si count>=2", !clientNeedsRelance({ status: "quoted", client_relanced_at: null, client_relance_count: 2 }, 1751961600000));
ok("pas de relance client si <24h depuis derniere", !clientNeedsRelance({ status: "quoted", client_relanced_at: new Date(1751961600000 - 5 * H).toISOString(), client_relance_count: 1 }, 1751961600000));
ok("pas de relance client si pas d'offre", !clientNeedsRelance({ status: "sent", client_relanced_at: null, client_relance_count: 0 }, 1751961600000));

ok("cloture auto si date debut atteinte", clientAutoCloseReason({ status: "quoted", date_from: "2025-07-08", client_relanced_at: null, client_relance_count: 0 }, 1751961600000) === "rental_started");
ok("cloture auto si client silencieux apres 2 relances +24h", clientAutoCloseReason({ status: "quoted", date_from: "2026-07-20", client_relanced_at: new Date(1751961600000 - 25 * H).toISOString(), client_relance_count: 2 }, 1751961600000) === "client_silent");
ok("pas de cloture auto si derniere relance <24h", clientAutoCloseReason({ status: "quoted", date_from: "2026-07-20", client_relanced_at: new Date(1751961600000 - 5 * H).toISOString(), client_relance_count: 2 }, 1751961600000) === null);
ok("pas de cloture auto si demande non quoted", clientAutoCloseReason({ status: "sent", date_from: "2026-07-20", client_relanced_at: null, client_relance_count: 0 }, 1751961600000) === null);

// (Tests closedResponderNeedsNotification retirés le 11/07/2026 : emails de
// clôture loueur supprimés, retour terrain Lux Trans.)

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

// Note libre du loueur, nee le 01/08/2026 : Luxtrans n'avait pas la city car
// demandee, a propose un VW T-Cross, et a du l'expliquer par TROIS emails faute
// de pouvoir l'ecrire dans son devis.
ok("note conservee", normalizeQuoteOption({ price: 100, note: "No city car left, this is a SUV" }).note === "No city car left, this is a SUV");
ok("note vide -> null", normalizeQuoteOption({ price: 100, note: "   " }).note === null);
ok("note absente -> null", normalizeQuoteOption({ price: 100 }).note === null);
ok("note tronquee a 140", normalizeQuoteOption({ price: 100, note: "x".repeat(200) }).note.length === 140);
// ⛔ La note s'affiche au CLIENT : un loueur qui y met ses coordonnees court-circuite
// la mise en relation, donc la commission. Retire, jamais refuse en silence total.
ok("email retire de la note", !/@/.test(normalizeQuoteOption({ price: 100, note: "write me at info@cretecar.rent" }).note));
ok("telephone retire de la note", !/\d{4}/.test(normalizeQuoteOption({ price: 100, note: "call +30 6940160266 now" }).note));
ok("une date n'est PAS prise pour un telephone", normalizeQuoteOption({ price: 100, note: "available from 2026-08-03" }).note.includes("2026-08-03"));
ok("un prix reste lisible", normalizeQuoteOption({ price: 580, note: "580 EUR for the week" }).note.includes("580"));

// Une boite de vitesses n'est PAS un modele de voiture. Le libelle partait
// jusqu'au 01/08/2026 en `[car_model, gearbox].filter(Boolean).join(' · ')` :
// modele vide, il ne restait que « Manual », affiche au client A LA PLACE du
// modele. Constate en prod sur les demandes 25 (Zorbas) et 33 (Zakros Tours).
ok("modele + boite", quotedModelLabel("VW Polo", "Automatic") === "VW Polo · Automatic");
ok("modele seul", quotedModelLabel("VW Polo", null) === "VW Polo");
ok("boite SEULE ne fait pas un modele", quotedModelLabel(null, "Manual") === null);
ok("modele vide ne fait pas un modele", quotedModelLabel("   ", "Manual") === null);
ok("ni modele ni boite", quotedModelLabel(null, null) === null);
ok("modele espace-entoure nettoye", quotedModelLabel("  Fiat Panda  ", null) === "Fiat Panda");

const opt = (id, invite_id, price) => ({ id, invite_id, partner_id: invite_id, partner_name: `P${invite_id}`, price, currency: "EUR", car_model: null, gearbox: null, inclusions: [], created_at: "2026-07-08T10:00:00Z" });
ok("sortOptionsByPrice croissant toutes invites confondues", sortOptionsByPrice([opt(1, 10, 40), opt(2, 10, 30), opt(3, 20, 35)]).map((o) => o.id).join() === "2,3,1");
ok("findChosenOption existante", findChosenOption([opt(1, 10, 40), opt(2, 20, 30)], 2)?.id === 2);
ok("findChosenOption inexistante -> null", findChosenOption([opt(1, 10, 40)], 99) === null);

console.log(fail ? `\n${fail} FAIL` : "\nAll passed");
process.exit(fail ? 1 : 0);
