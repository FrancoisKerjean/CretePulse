// node --experimental-strip-types scripts/check-car-monitoring.mjs
import { classifyInvites, reconcileWinnerSnapshot, partnerRelanceState, partnerRelanceRollup, clientRelanceState, isSilentRequest, isAwaitingChoice, buildTimeline, kpis, partnerPerf } from "../src/lib/car-monitoring.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

// Fabrique d'invite : id, price, status, options temporelles.
const inv = (id, price, status = "quoted", o = {}) => ({
  id, request_id: 1, partner_id: id, partner_name: `P${id}`, status,
  quote_price: price, quote_currency: price == null ? null : "EUR",
  quote_car_model: null,
  created_at: o.created_at ?? "2026-07-08T08:00:00Z",
  quoted_at: o.quoted_at ?? (price == null ? null : "2026-07-08T10:00:00Z"),
  declined_at: o.declined_at ?? (status === "declined" ? "2026-07-08T09:00:00Z" : null),
  relanced_at: o.relanced_at ?? null,
});

// reconcileWinnerSnapshot : reporte le devis gagnant first-come (car_requests.quoted_*) sur l'invite du loueur.
{
  const legacy = [
    inv(7, null, "invited", { created_at: "2026-07-08T08:00:00Z" }),
    inv(8, null, "invited"),
  ];
  const rec = reconcileWinnerSnapshot(legacy, { status: "quoted", quoted_by_partner_id: 7, quoted_price: 370, quoted_at: "2026-07-08T10:00:00Z" });
  ok("gagnant legacy -> chiffré 370", rec.find((i) => i.partner_id === 7).quote_price === 370);
  ok("gagnant legacy -> status quoted", rec.find((i) => i.partner_id === 7).status === "quoted");
  ok("gagnant legacy -> plus silencieux", classifyInvites(rec).silent.every((i) => i.partner_id !== 7));
  ok("autre invite inchangée", rec.find((i) => i.partner_id === 8).quote_price === null);
  const recA = reconcileWinnerSnapshot(legacy, { status: "accepted", quoted_by_partner_id: 7, quoted_price: 370, quoted_at: null });
  ok("gagnant accepted -> chosen", recA.find((i) => i.partner_id === 7).status === "chosen");
  const real = [inv(7, 300, "quoted")];
  const recR = reconcileWinnerSnapshot(real, { status: "quoted", quoted_by_partner_id: 7, quoted_price: 999, quoted_at: null });
  ok("invite déjà chiffrée non écrasée", recR[0].quote_price === 300);
  ok("sans snapshot -> identité", reconcileWinnerSnapshot(legacy, { status: "sent", quoted_by_partner_id: null, quoted_price: null, quoted_at: null }) === legacy);
}

// classifyInvites : 3 seaux, chiffrés triés prix↑ (choisi en tête), puis silencieux, puis désistés.
{
  const c = classifyInvites([
    inv(1, 300), inv(2, 200), inv(3, null, "invited"),
    inv(4, 250, "chosen"), inv(5, null, "declined"),
  ]);
  ok("chiffrés = 3 (200/250chosen/300)", c.quoted.length === 3);
  ok("choisi en tête", c.quoted[0].id === 4);
  ok("puis prix croissant", c.quoted[1].id === 2 && c.quoted[2].id === 1);
  ok("silencieux = invite 3", c.silent.length === 1 && c.silent[0].id === 3);
  ok("désisté = invite 5", c.declined.length === 1 && c.declined[0].id === 5);
}

const H = 3600000;
const T = (ms) => new Date(ms).toISOString();
const NOW = Date.parse("2026-07-09T10:00:00Z");

// partnerRelanceState (demande ouverte 'sent')
{
  const created = NOW - 30 * H; // >24h
  ok("relance loueur due (>24h, jamais relancé)",
    partnerRelanceState(inv(1, null, "invited", { created_at: T(created) }), "sent", created, NOW).kind === "due");
  ok("relance loueur déjà faite",
    partnerRelanceState(inv(1, null, "invited", { created_at: T(created), relanced_at: T(NOW - 2 * H) }), "sent", created, NOW).kind === "relanced");
  // Seuil ramene a H+2 le 01/08/2026 : une invite de 5 h est desormais DUE, le
  // decompte ne concerne plus que les deux premieres heures.
  ok("relance loueur due des 5h", partnerRelanceState(inv(1, null, "invited", { created_at: T(NOW - 5 * H) }), "sent", NOW - 5 * H, NOW).kind === "due");
  const dueIn = partnerRelanceState(inv(1, null, "invited", { created_at: T(NOW - 0.5 * H) }), "sent", NOW - 0.5 * H, NOW);
  ok("relance loueur due dans Xh (<2h)", dueIn.kind === "dueInMs" && dueIn.ms > 1 * H && dueIn.ms < 2 * H);
  ok("pas de relance si demande fermée",
    partnerRelanceState(inv(1, null, "invited", { created_at: T(created) }), "accepted", created, NOW).kind === "never");
}

// partnerRelanceRollup
{
  const roll = partnerRelanceRollup([
    inv(1, 200), inv(2, null, "invited"), inv(3, null, "invited", { relanced_at: T(NOW) }), inv(4, null, "declined"),
  ]);
  ok("rollup invited(total)=4", roll.invited === 4);
  ok("rollup quoted=1", roll.quoted === 1);
  ok("rollup relanced=1", roll.relanced === 1);
  ok("rollup silent=1 (invited non relancé)", roll.silent === 1);
  ok("rollup declined=1", roll.declined === 1);
}

{
  ok("client relance na si pas 'quoted'",
    clientRelanceState({ status: "sent", client_relanced_at: null, client_relance_count: 0 }, NOW).kind === "na");
  ok("client relance eligible (jamais relancé)",
    clientRelanceState({ status: "quoted", client_relanced_at: null, client_relance_count: 0 }, NOW).kind === "eligible");
  ok("client relance exhausted (count>=2)",
    clientRelanceState({ status: "quoted", client_relanced_at: null, client_relance_count: 2 }, NOW).kind === "exhausted");
  const w = clientRelanceState({ status: "quoted", client_relanced_at: T(NOW - 5 * H), client_relance_count: 1 }, NOW);
  ok("client relance waiting (<24h depuis dernière)", w.kind === "waiting" && w.nextEligibleMs > NOW);
}

{
  const old = { status: "sent", created_at: T(NOW - 30 * H) };
  const fresh = { status: "sent", created_at: T(NOW - 2 * H) };
  ok("silencieux : sent >24h sans devis", isSilentRequest(old, [inv(1, null, "invited")], NOW) === true);
  ok("pas silencieux si <24h", isSilentRequest(fresh, [inv(1, null, "invited")], NOW) === false);
  ok("pas silencieux si ≥1 devis", isSilentRequest(old, [inv(1, 200)], NOW) === false);

  ok("en attente de choix : quoted + ≥1 devis", isAwaitingChoice({ status: "quoted" }, [inv(1, 200)]) === true);
  ok("pas en attente si accepted", isAwaitingChoice({ status: "accepted" }, [inv(1, 200, "chosen")]) === false);
  ok("pas en attente si quoted sans invite chiffrée", isAwaitingChoice({ status: "quoted" }, [inv(1, null, "invited")]) === false);
}

{
  const req = {
    created_at: "2026-07-08T08:00:00Z", accepted_at: "2026-07-08T12:00:00Z",
    client_relanced_at: null, outcome: null, outcome_at: null,
  };
  const invites = [
    inv(1, 200, "chosen", { created_at: "2026-07-08T08:05:00Z", quoted_at: "2026-07-08T10:00:00Z" }),
    inv(2, null, "declined", { created_at: "2026-07-08T08:05:00Z", declined_at: "2026-07-08T09:00:00Z" }),
  ];
  const tl = buildTimeline(req, invites);
  ok("timeline triée chrono", tl.every((e, i) => i === 0 || tl[i - 1].at <= e.at));
  ok("timeline contient création", tl[0].at === "2026-07-08T08:00:00Z");
  ok("timeline contient 1er devis", tl.some((e) => e.label.includes("1er devis")));
  ok("timeline contient désistement", tl.some((e) => e.label.toLowerCase().includes("désist")));
  ok("timeline contient choix client", tl.some((e) => e.label.toLowerCase().includes("choisi")));
}

// Timeline : UN événement par devis (bug 09/07 : un seul « 1er devis » affiché)
{
  const req = {
    created_at: "2026-07-08T08:00:00Z", accepted_at: null,
    client_relanced_at: null, outcome: null, outcome_at: null,
  };
  const invites = [
    inv(1, 750, "quoted", { created_at: "2026-07-08T08:05:00Z", quoted_at: "2026-07-08T23:56:00Z" }),
    inv(2, 665, "quoted", { created_at: "2026-07-08T08:05:00Z", quoted_at: "2026-07-09T08:28:00Z" }),
    inv(3, 680, "quoted", { created_at: "2026-07-08T08:05:00Z", quoted_at: "2026-07-09T08:37:00Z" }),
    inv(4, null, "invited"),
  ];
  const tl = buildTimeline(req, invites);
  const devisEvents = tl.filter((e) => /devis/i.test(e.label));
  ok("timeline : 3 devis (un par loueur chiffré)", devisEvents.length === 3);
  ok("timeline : 1er devis = Luxtrans le + tôt", tl.find((e) => e.label.includes("1er devis")).label.includes("P1"));
  ok("timeline : devis suivants numérotés", tl.some((e) => e.label.includes("devis n°2")) && tl.some((e) => e.label.includes("devis n°3")));
  ok("timeline : montre le prix du devis", tl.some((e) => e.label.includes("665")));
  ok("timeline : matérialise la notif client", tl.filter((e) => e.label.includes("client notifié")).length === 3);
}

// Task 10 : kpis()
{
  const mkReq = (id, status, o = {}) => ({
    id, status, created_at: o.created_at ?? T(NOW - 48 * H), accepted_at: o.accepted_at ?? null,
    client_relanced_at: o.client_relanced_at ?? null, client_relance_count: o.client_relance_count ?? 0,
  });
  const reqs = [mkReq(1, "quoted"), mkReq(2, "accepted", { accepted_at: T(NOW - 10 * H) }), mkReq(3, "sent")];
  // req 1 : 2 invites chiffrées (→ withQuote++ ; totalQuotes += 2) + 1 silencieuse
  // req 2 : 1 invite chiffrée chosen (→ withQuote++ ; totalQuotes += 1)
  // req 3 : 1 invite silencieuse
  // Totaux : withQuote=2, totalQuotes=3 → avgQuotesPerRequest=1.5
  //          totalInvites=5, silentInvites=2 → silentInviteRate=2/5
  const byReq = new Map([
    [1, [inv(1, 200), inv(5, 250), inv(2, null, "invited")]],
    [2, [inv(3, 180, "chosen", { quoted_at: T(NOW - 40 * H) })]],
    [3, [inv(4, null, "invited")]],
  ]);
  const k = kpis(reqs, byReq, NOW);
  ok("count = 3", k.count === 3);
  ok("quoteRate = 2/3", Math.abs(k.quoteRate - 2 / 3) < 1e-9);
  ok("choiceRate = 1/2 (accepted / withQuote)", Math.abs(k.choiceRate - 0.5) < 1e-9);
  ok("silentInviteRate = 2/5", Math.abs(k.silentInviteRate - 2 / 5) < 1e-9);
  ok("partnerDeclineRate = 0/5 = 0 (aucun désisté sur 5 invites)", k.partnerDeclineRate === 0);
  // Correction 5 : avgQuotesPerRequest > 1 quand une demande a 2 invites chiffrées
  ok("avgQuotesPerRequest = 3/2 = 1.5 (req1 a 2 devis, req2 en a 1)", Math.abs(k.avgQuotesPerRequest - 1.5) < 1e-9);
}

// Task 11 : partnerPerf()
{
  const byPartner = new Map([[7, [
    inv(1, 200, "chosen", { created_at: T(NOW - 40 * H), quoted_at: T(NOW - 38 * H) }),
    inv(2, 240, "not_chosen", { created_at: T(NOW - 30 * H), quoted_at: T(NOW - 29 * H) }),
    { ...inv(3, null, "declined"), partner_id: 7 },
    { ...inv(4, null, "invited"), partner_id: 7 },
  ]]]);
  const p = partnerPerf(7, byPartner);
  ok("invited = 4", p.invited === 4);
  ok("quoted = 2", p.quoted === 2);
  ok("chosen = 1", p.chosen === 1);
  ok("declined = 1", p.declined === 1);
  ok("avg quote = 220", p.avgQuotePriceEur === 220);
  ok("responseRate = 3/4 (quoted+declined)", Math.abs(p.responseRate - 0.75) < 1e-9);
  ok("avgResponseHours ≈ 1.5", p.avgResponseHours != null && Math.abs(p.avgResponseHours - 1.5) < 0.01);
  ok("partenaire inconnu → invited 0, ratios null", partnerPerf(99, byPartner).invited === 0 && partnerPerf(99, byPartner).responseRate === null);
}

console.log(fail ? `\n${fail} FAIL` : "\nAll passed");
process.exit(fail ? 1 : 0);
