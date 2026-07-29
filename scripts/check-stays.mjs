import { computeQuote } from "../src/lib/stays/pricing.ts";
import { computeRefund } from "../src/lib/stays/cancellation.ts";
import { validateStayRequest } from "../src/lib/stays/validation.ts";

let failures = 0;
const ok = (label, cond) => {
  if (!cond) {
    console.error("FAIL:", label);
    failures++;
  } else {
    console.log("ok:", label);
  }
};

// basePriceEur est un tarif A LA NUIT (decision Kami 25/07/2026), pas un forfait.
// 100 EUR x 7 nuits = 700 net proprietaire, +5% = 735 pour le voyageur.
const q = computeQuote({
  basePriceEur: 100,
  cleaningFeeEur: 0,
  commissionRate: 5,
  dateFrom: "2026-07-01",
  dateTo: "2026-07-08",
});
ok("nights = 7", q.nights === 7);
ok("owner net = 700", q.ownerNetEur === 700);
ok("guest total = 735", q.guestTotalEur === 735);
ok("deposit = 220.5", q.depositEur === 220.5);
ok("balance = 514.5", q.balanceEur === 514.5);

// Invariant d'encaissement : la commission prelevee sur l'acompte plus celle
// prelevee sur le solde valent exactement la commission du sejour, au centime.
// Le solde porte le reste, cf src/app/api/stays/pay-balance/route.ts.
const commissionCents = Math.round(q.commissionEur * 100);
const balanceFeeCents = commissionCents - q.applicationFeeCents;
ok("fee acompte = 1050 centimes", q.applicationFeeCents === 1050);
ok("fee solde = 2450 centimes", balanceFeeCents === 2450);
ok(
  "fee acompte + fee solde = commission (3500 centimes)",
  q.applicationFeeCents + balanceFeeCents === commissionCents &&
    commissionCents === 3500,
);
ok("refund >14 = 100%", computeRefund(735, 20) === 735);
ok("refund <48h = 0", computeRefund(735, 1) === 0);
ok(
  "honeypot detected",
  validateStayRequest({
    website: "x",
    guestName: "a",
    guestEmail: "a@b.c",
    dateFrom: "2026-07-01",
    dateTo: "2026-07-02",
  }).kind === "honeypot",
);

if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("check:stays OK");
