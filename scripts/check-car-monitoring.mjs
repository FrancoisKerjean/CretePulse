// node --experimental-strip-types scripts/check-car-monitoring.mjs
import { classifyInvites } from "../src/lib/car-monitoring.ts";

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

console.log(fail ? `\n${fail} FAIL` : "\nAll passed");
process.exit(fail ? 1 : 0);
