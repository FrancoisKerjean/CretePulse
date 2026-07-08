// node --experimental-strip-types scripts/check-car-monitoring.mjs
import { classifyInvites, partnerRelanceState, partnerRelanceRollup, clientRelanceState } from "../src/lib/car-monitoring.ts";

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
  const dueIn = partnerRelanceState(inv(1, null, "invited", { created_at: T(NOW - 5 * H) }), "sent", NOW - 5 * H, NOW);
  ok("relance loueur due dans Xh (<24h)", dueIn.kind === "dueInMs" && dueIn.ms > 18 * H && dueIn.ms < 20 * H);
  ok("pas de relance si demande fermée",
    partnerRelanceState(inv(1, null, "invited", { created_at: T(created) }), "accepted", created, NOW).kind === "never");
}

// partnerRelanceRollup
{
  const roll = partnerRelanceRollup([
    inv(1, 200), inv(2, null, "invited"), inv(3, null, "invited", { relanced_at: T(NOW) }), inv(4, null, "declined"),
  ]);
  ok("rollup invited=2", roll.invited === 2);
  ok("rollup relanced=1", roll.relanced === 1);
  ok("rollup silent=2 (invited-status)", roll.silent === 2);
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

console.log(fail ? `\n${fail} FAIL` : "\nAll passed");
process.exit(fail ? 1 : 0);
