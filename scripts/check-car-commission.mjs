// Gate CI de l'encaissement de la commission loueur.
//
// Il appelle les MEMES fonctions que le back-office et le webhook : si la regle
// de facturation derive dans le code, ce gate tombe. Il ne reecrit aucune formule.
import {
  shouldRequestCommission,
  buildCommissionCheckoutParams,
  commissionRequestBody,
  STRIPE_MIN_CHARGE_EUR,
} from "../src/lib/car-commission.ts";
import { commissionEur } from "../src/lib/car-admin.ts";

let failures = 0;
const ok = (label, cond) => {
  if (!cond) {
    console.error("FAIL:", label);
    failures++;
  } else {
    console.log("ok:", label);
  }
};

const base = {
  id: 42,
  outcome: "rented",
  commission_eur: 31.5,
  commission_paid_at: null,
  commission_session_id: null,
  quoted_by_partner_id: 111,
};

// Invariant 1 : on ne facture QUE ce qui est encaissable et pas deja parti.
ok("location louee et non facturee : on facture", shouldRequestCommission(base) === true);
ok("commission deja reglee : on ne refacture pas", shouldRequestCommission({ ...base, commission_paid_at: "2026-07-29T00:00:00Z" }) === false);
ok("demande deja partie : pas de seconde session", shouldRequestCommission({ ...base, commission_session_id: "cs_1" }) === false);
ok("location perdue : rien a facturer", shouldRequestCommission({ ...base, outcome: "lost" }) === false);
ok("aucun loueur gagnant : rien a facturer", shouldRequestCommission({ ...base, quoted_by_partner_id: null }) === false);
ok(`sous ${STRIPE_MIN_CHARGE_EUR} EUR : refuse par Stripe, donc jamais tente`, shouldRequestCommission({ ...base, commission_eur: STRIPE_MIN_CHARGE_EUR - 0.01 }) === false);

// Invariant 2 : le montant facture est exactement la commission du taux partenaire,
// jamais le montant de la location. Un signe inverse ici viderait le compte du loueur.
for (const [amount, rate] of [[210, 0.15], [89.9, 0.1], [1250, 0.12], [45, 0.2]]) {
  const eur = commissionEur(amount, rate);
  const params = buildCommissionCheckoutParams({
    requestId: 1, partnerName: "P", partnerEmail: "p@x.gr",
    commissionEur: eur, finalAmountEur: amount,
    dateFrom: "2026-08-01", dateTo: "2026-08-08",
  });
  const cents = params.line_items[0].price_data.unit_amount;
  ok(`facture ${eur} EUR sur une location de ${amount} EUR a ${rate * 100} %`, cents === Math.round(eur * 100));
  ok(`facture strictement moins que la location (${amount} EUR)`, cents < Math.round(amount * 100));
}

// Invariant 3 : ce flux ne depend PAS de Stripe Connect. C'est ce qui le rend
// livrable tant que la plateforme Connect n'est pas activee.
const p = buildCommissionCheckoutParams({
  requestId: 1, partnerName: "P", partnerEmail: "p@x.gr",
  commissionEur: 10, finalAmountEur: 100, dateFrom: "2026-08-01", dateTo: "2026-08-08",
});
ok("aucun transfer_data : encaissement direct plateforme", p.payment_intent_data.transfer_data === undefined);
ok("aucun application_fee_amount", p.payment_intent_data.application_fee_amount === undefined);
ok("discriminants webhook presents", p.metadata.payment_type === "car_commission" && p.metadata.brand === "crete.direct");
ok("montant du lisible dans l email", commissionRequestBody({
  requestId: 42, partnerName: "P", commissionEur: 31.5, finalAmountEur: 210,
  dateFrom: "2026-08-01", dateTo: "2026-08-08", payUrl: "https://x",
}).includes("31.50"));

if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("check:car-commission OK");
