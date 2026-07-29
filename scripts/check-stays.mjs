import { computeQuote, balanceApplicationFeeCents } from "../src/lib/stays/pricing.ts";
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
// balanceApplicationFeeCents est la fonction qu'appelle reellement
// /api/stays/pay-balance : si la route change de formule, ce gate tombe.
const commissionCents = Math.round(q.commissionEur * 100);
const balanceFeeCents = balanceApplicationFeeCents(q);
ok("fee acompte = 1050 centimes", q.applicationFeeCents === 1050);
ok("fee solde = 2450 centimes", balanceFeeCents === 2450);
ok(
  "fee acompte + fee solde = commission (3500 centimes)",
  q.applicationFeeCents + balanceFeeCents === commissionCents &&
    commissionCents === 3500,
);

// L'invariant doit tenir hors du cas d'ecole : tarifs a la virgule, menage,
// taux non entier, sejours courts. Un arrondi qui derive se voit ici.
for (const input of [
  { basePriceEur: 87, cleaningFeeEur: 45, commissionRate: 5, dateFrom: "2026-08-01", dateTo: "2026-08-04" },
  { basePriceEur: 233.33, cleaningFeeEur: 12.5, commissionRate: 7.5, dateFrom: "2026-09-10", dateTo: "2026-09-21" },
  { basePriceEur: 45, cleaningFeeEur: 0, commissionRate: 12, dateFrom: "2026-05-02", dateTo: "2026-05-05" },
  { basePriceEur: 61.9, cleaningFeeEur: 33.33, commissionRate: 5, dateFrom: "2026-06-01", dateTo: "2026-06-02" },
]) {
  const quote = computeQuote(input);
  const total = Math.round(quote.commissionEur * 100);
  ok(
    `invariant fee acompte + fee solde = commission (${input.basePriceEur} EUR/nuit, ${input.commissionRate} %)`,
    quote.applicationFeeCents + balanceApplicationFeeCents(quote) === total,
  );
  // Second invariant : le voyageur ne paie jamais autre chose que le total annonce.
  ok(
    `invariant acompte + solde = total voyageur (${input.basePriceEur} EUR/nuit)`,
    Math.round((quote.depositEur + quote.balanceEur) * 100) ===
      Math.round(quote.guestTotalEur * 100),
  );
}
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
